(() => {

  'use strict';

  const $ = id => document.getElementById(id);

  const sampleDataEl = $('sample-data');

  if (!sampleDataEl) return;



  const allSamples = JSON.parse(sampleDataEl.textContent);

  const samples = allSamples.slice(0, 10);

  const narrow = matchMedia('(max-width:640px)');

  const step = () => narrow.matches ? 1 : 2;

  const imageCache = new Map();



  function loadedImage(path) {

    const url = new URL(path, document.baseURI);

    if (!imageCache.has(url.href)) {

      const promise = new Promise((resolve, reject) => {

        const im = new Image();

        im.onload = async () => {

          try {

            await im.decode();

            if (!im.naturalWidth) throw new Error('Empty image');

            resolve(url.href);

          } catch (error) {

            reject(error);

          }

        };

        im.onerror = () => reject(new Error('Image unavailable'));

        im.src = url.href;

      });

      imageCache.set(url.href, promise);

      promise.catch(() => imageCache.delete(url.href));

    }

    return imageCache.get(url.href);

  }



  async function pageImage(sample) {

    try {

      return await loadedImage(sample.src);

    } catch {

      return loadedImage(sample.thumb);

    }

  }



  let bookIndex = 0, bookOpened = false, bookBusy = false, bookRequest = 0;



  function bookButtons() {

    const prevBtn = $('book-prev');

    const nextBtn = $('book-next');

    if (prevBtn) prevBtn.disabled = !bookOpened || bookBusy || bookIndex === 0;

    if (nextBtn) nextBtn.disabled = !bookOpened || bookBusy || bookIndex + step() >= samples.length;

  }



  async function renderBook(nextIndex = bookIndex) {

    const request = ++bookRequest;

    nextIndex = Math.max(0, Math.min(samples.length - step(), nextIndex));

    bookBusy = true;

    bookButtons();

    const bookLabel = $('book-label');

    if (bookLabel) bookLabel.textContent = 'Carregando as páginas…';



    try {

      const chosen = samples.slice(nextIndex, nextIndex + step());

      const urls = await Promise.all(chosen.map(pageImage));

      if (request !== bookRequest || !bookOpened) return;



      chosen.forEach((s, i) => {

        const b = $(i === 0 ? 'book-left' : 'book-right');

        if (!b) return;

        const im = b.querySelector('img');

        if (im) {

          im.src = urls[i];

          im.alt = s.title;

        }

        b.hidden = false;

        b.setAttribute('aria-label', 'Ampliar: ' + s.title);

        b.onclick = () => openSample(s.id);

      });



      await Promise.all(chosen.map((_, i) => {

        const b = $(i === 0 ? 'book-left' : 'book-right');

        const im = b ? b.querySelector('img') : null;

        return im ? im.decode() : Promise.resolve();

      }));



      if (request !== bookRequest || !bookOpened) return;



      const bookRight = $('book-right');

      if (bookRight) bookRight.hidden = step() === 1;



      const bookOpen = $('book-open');

      if (bookOpen) bookOpen.hidden = true;



      const bookSpread = $('book-spread');

      if (bookSpread) bookSpread.hidden = false;



      const bookClose = $('book-close');

      if (bookClose) bookClose.hidden = false;



      bookIndex = nextIndex;

      const bookCount = $('book-count');

      if (bookCount) {

        bookCount.textContent = (bookIndex + 1) + (step() === 2 ? '–' + (bookIndex + 2) : '') + ' / 10';

      }

      if (bookLabel) {

        bookLabel.textContent = samples[bookIndex].book + ' · Página ' + samples[bookIndex].page;

      }

      samples.slice(bookIndex + step(), bookIndex + step() * 2).forEach(s => pageImage(s).catch(() => {}));

    } catch {

      if (bookLabel) bookLabel.textContent = 'Não foi possível carregar. Tente novamente.';

    } finally {

      if (request === bookRequest) {

        bookBusy = false;

        bookButtons();

      }

    }

  }



  const bookOpenBtn = $('book-open');

  if (bookOpenBtn) {

    bookOpenBtn.onclick = async () => {

      bookOpened = true;

      await renderBook();

      const nextBtn = $('book-next');

      if (nextBtn && !nextBtn.disabled) nextBtn.focus({ preventScroll: true });

    };

  }



  const bookCloseBtn = $('book-close');

  if (bookCloseBtn) {

    bookCloseBtn.onclick = () => {

      bookRequest++;

      bookOpened = false;

      bookBusy = false;

      const bOpen = $('book-open');

      if (bOpen) bOpen.hidden = false;

      const bSpread = $('book-spread');

      if (bSpread) bSpread.hidden = true;

      bookCloseBtn.hidden = true;

      const bCount = $('book-count');

      if (bCount) bCount.textContent = 'BIBLIOTECA';

      const bLabel = $('book-label');

      if (bLabel) bLabel.textContent = 'TOQUE PARA ABRIR';

      bookButtons();

      if (bOpen) bOpen.focus({ preventScroll: true });

    };

  }



  function turn(direction) {

    if (bookOpened && !bookBusy) renderBook(bookIndex + direction * step());

  }



  const prevBtn = $('book-prev');

  if (prevBtn) prevBtn.onclick = () => turn(-1);



  const nextBtn = $('book-next');

  if (nextBtn) nextBtn.onclick = () => turn(1);



  const bookStage = $('book-stage');

  if (bookStage) {

    bookStage.addEventListener('keydown', e => {

      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {

        e.preventDefault();

        turn(e.key === 'ArrowRight' ? 1 : -1);

      }

    });



    let startX = 0;

    bookStage.addEventListener('touchstart', e => startX = e.changedTouches[0].screenX, { passive: true });

    bookStage.addEventListener('touchend', e => {

      const dx = e.changedTouches[0].screenX - startX;

      if (Math.abs(dx) > 65) turn(dx < 0 ? 1 : -1);

    }, { passive: true });

  }



  narrow.addEventListener('change', () => {

    if (bookOpened) renderBook();

  });



  const modal = $('sample-dialog');

  let modalSamples = allSamples, modalIndex = 0, modalBusy = false, modalRequest = 0;



  async function renderSample(index) {

    const request = ++modalRequest;

    modalBusy = true;

    const sPrev = $('sample-prev');

    const sNext = $('sample-next');

    if (sPrev) sPrev.disabled = true;

    if (sNext) sNext.disabled = true;



    try {

      const sample = modalSamples[index];

      const url = await pageImage(sample);

      if (request !== modalRequest) return;



      const sampleFull = $('sample-full');

      if (sampleFull) {

        sampleFull.src = url;

        await sampleFull.decode();

        if (request !== modalRequest) return;

        sampleFull.alt = sample.title;

        sampleFull.classList.remove('zoomed');

        sampleFull.title = 'Toque para ampliar';

      }



      const sTitle = $('sample-title');

      if (sTitle) sTitle.textContent = sample.title;



      const sOrigin = $('sample-origin');

      if (sOrigin) sOrigin.textContent = sample.book + ' · Página ' + sample.page;



      const sScroll = $('sample-scroll');

      if (sScroll) {

        sScroll.scrollTop = 0;

        sScroll.scrollLeft = 0;

      }



      modalIndex = index;

      const sCount = $('sample-count');

      if (sCount) sCount.textContent = (index + 1) + ' / ' + modalSamples.length;



      if (modal && !modal.open) {

        modal.showModal();

        document.body.classList.add('modal-open');

      }



      if (modalSamples[index + 1]) pageImage(modalSamples[index + 1]).catch(() => {});

    } catch {

      const sCount = $('sample-count');

      if (sCount) sCount.textContent = 'Não foi possível carregar. Tente novamente.';

    } finally {

      if (request === modalRequest) {

        modalBusy = false;

        if (sPrev) sPrev.disabled = modalIndex === 0;

        if (sNext) sNext.disabled = modalIndex === modalSamples.length - 1;

      }

    }

  }



  function openSample(id) {
    const index = allSamples.findIndex(s => s.id === id);
    if (index < 0) return;
    if (index < 10) {
      // Galeria principal de amostras: 10 páginas (1 / 10)
      modalSamples = samples;
      renderSample(index);
    } else if (allSamples[index].id.startsWith('bonus')) {
      // Amostras dos bônus: 5 páginas (1 / 5)
      const bonusList = allSamples.filter(s => s.id.startsWith('bonus'));
      const bIdx = bonusList.findIndex(s => s.id === id);
      modalSamples = bonusList;
      renderSample(bIdx >= 0 ? bIdx : 0);
    } else {
      // Botões específicos (comparador, visor óptico, tira reagente): abre apenas a página focada (1 / 1)
      modalSamples = [allSamples[index]];
      renderSample(0);
    }
  }



  window.openAtlasSample = openSample;



  const sClose = $('sample-close');

  if (sClose && modal) {

    sClose.onclick = () => modal.close();

  }



  const sPrevBtn = $('sample-prev');

  if (sPrevBtn) {

    sPrevBtn.onclick = () => {

      if (!modalBusy && modalIndex > 0) renderSample(modalIndex - 1);

    };

  }



  const sNextBtn = $('sample-next');

  if (sNextBtn) {

    sNextBtn.onclick = () => {

      if (!modalBusy && modalIndex < modalSamples.length - 1) renderSample(modalIndex + 1);

    };

  }



  const sampleFull = $('sample-full');

  if (sampleFull) {

    sampleFull.onclick = () => {

      const zoomed = sampleFull.classList.toggle('zoomed');

      sampleFull.title = zoomed ? 'Toque para ajustar' : 'Toque para ampliar';

    };

  }



  document.querySelectorAll('[data-sample]').forEach(b => {

    b.onclick = () => openSample(b.dataset.sample);

  });



  document.querySelectorAll('[data-carousel-pause]').forEach(button => {

    const gallery = button.closest('.ecografia_gallery__FgeDv');

    if (!gallery) return;

    const reduced = matchMedia('(prefers-reduced-motion:reduce)').matches;

    gallery.dataset.paused = String(reduced);



    function label() {

      const paused = gallery.dataset.paused === 'true';

      button.setAttribute('aria-pressed', String(paused));

      button.textContent = paused ? 'Retomar carrossel ▶' : 'Pausar carrossel Ⅱ';

    }



    label();

    button.onclick = () => {

      gallery.dataset.paused = String(gallery.dataset.paused !== 'true');

      label();

      button.blur();

    };

  });



  const upgrade = $('upgrade-dialog');

  const openUpgradeBtn = $('open-upgrade');

  const closeUpgradeBtn = $('close-upgrade');

  if (upgrade && openUpgradeBtn) {

    openUpgradeBtn.onclick = () => {

      upgrade.showModal();

      document.body.classList.add('modal-open');

    };

  }

  if (upgrade && closeUpgradeBtn) {

    closeUpgradeBtn.onclick = () => upgrade.close();

  }



  [modal, upgrade].forEach(d => {

    if (!d) return;

    d.addEventListener('click', e => {

      if (e.target === d) {

        const r = d.getBoundingClientRect();

        if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) {

          d.close();

        }

      }

    });

    d.addEventListener('close', () => document.body.classList.remove('modal-open'));

  });



  if (modal) {

    modal.addEventListener('keydown', e => {

      if (e.key === 'ArrowLeft') {

        const p = $('sample-prev');

        if (p) p.click();

      }

      if (e.key === 'ArrowRight') {

        const n = $('sample-next');

        if (n) n.click();

      }

    });

  }



  /* ========================================================================

     INTERACTIVE WIDGET 1: OCULAR DE MICROSCÓPIO (100x vs 400x)

     ======================================================================== */

  const ocularPresets = {

    '100x-cilindros': {

      mag: '100x',

      focus: 'normal',

      hudTop: 'OBJETIVA 10x · CAMPO 100x · VARREDURA',

      hudBottom: 'Cilindro hialino vs. muco em borda de lamínula',

      img: 'assets/samples/atlas-047.webp',

      sampleId: 'atlas-047',

      title: '100x · Varredura Panorâmica de Cilindros e Muco',

      desc: 'Em menor aumento e condensador baixo, você percorre as bordas da lamínula para localizar matrizes cilíndricas de baixo índice de refração antes de trocar para 400x.',

      bullets: [

        '<b>Onde focar:</b> Bordas da lamínula e campos periféricos com contraste reduzido.',

        '<b>O que diferenciar:</b> Extremidades arredondadas e lados paralelos do cilindro hialino contra fitas irregulares de muco.',

        '<b>Referência no Atlas:</b> Páginas 12, 47 e 83 com esquemas e micrografias reais.'

      ]

    },

    '400x-acantocitos': {

      mag: '400x',

      focus: 'fine',

      hudTop: 'OBJETIVA 40x · CAMPO 400x · DETALHE CELULAR',

      hudBottom: 'Dismorfismo eritrocitário · Acantócito (G1)',

      img: 'assets/samples/atlas-029.webp',

      sampleId: 'atlas-029',

      title: '400x · Hemácias Dismórficas e Acantócitos (G1)',

      desc: 'No aumento de 400x, o ajuste fino do micrométrico revela o anel citoplasmático com protrusões vesiculares (blebs) típicas de hematúria de origem glomerular.',

      bullets: [

        '<b>Onde focar:</b> Contorno da membrana celular e projeções em forma de orelha de Mickey.',

        '<b>O que diferenciar:</b> Hemácias crenadas (hiperosmolares) têm espículas pontiagudas uniformes, não vesículas arredondadas.',

        '<b>Referência no Atlas:</b> Páginas 27, 28, 29, 85 e Caso Guiado 01 (pág. 93).'

      ]

    },

    '400x-cristais': {

      mag: '400x',

      focus: 'fine',

      hudTop: 'OBJETIVA 40x · CAMPO 400x · CRISTALÚRIA',

      hudBottom: 'Oxalato de cálcio: envelope (di) × oval (mono)',

      img: 'assets/samples/atlas-087.webp',

      sampleId: 'atlas-087',

      title: '400x · Geometria de Cristais e Faces Ópticas',

      desc: 'Compare o clássico envelope bipiramidal do oxalato di-hidratado com os discos ovais/halteres do monoidratado, que podem mimetizar hemácias isomórficas.',

      bullets: [

        '<b>Onde focar:</b> Cruzamento das linhas diagonais internas, refração intensa e ausência de halo bicôncavo.',

        '<b>Correlação química:</b> Verifique sempre o pH urinário na tira reagente antes de fechar a identificação.',

        '<b>Referência no Atlas:</b> Páginas 34 a 46, 87 e Guia Rápido dos Cristais (Bônus 01).'

      ]

    },

    '400x-leveduras': {

      mag: '400x',

      focus: 'fine',

      hudTop: 'OBJETIVA 40x · CAMPO 400x · DIFERENCIAL CRÍTICO',

      hudBottom: 'Leveduras com gema aderida × hemácias',

      img: 'assets/samples/atlas-081.webp',

      sampleId: 'atlas-081',

      title: '400x · Leveduras em Brotamento vs. Hemácias',

      desc: 'Uma das confusões mais comuns na rotina: estruturas ovoides refringentes que simulam eritrócitos quando a tira reagente para sangue resulta negativa.',

      bullets: [

        '<b>Onde focar:</b> Procure gemas aderidas (brotamento), forma ovoide e variação de tamanho entre células vizinhas.',

        '<b>Quando suspeitar:</b> Sedimento rico em estruturas arredondadas mas com tira reagente negativa para hemoglobina.',

        '<b>Referência no Atlas:</b> Páginas 55, 78 e Comparação Lado a Lado na página 81.'

      ]

    }

  };



  const ocularButtons = document.querySelectorAll('[data-ocular-preset]');

  const ocularViewport = $('ocular-viewport');

  const ocularImg = $('ocular-img');

  const ocularHudTop = $('ocular-hud-top');

  const ocularHudBottom = $('ocular-hud-bottom');

  const ocularTitle = $('ocular-title');

  const ocularDesc = $('ocular-desc');

  const ocularList = $('ocular-list');

  const ocularZoomBtn = $('ocular-zoom-btn');



  ocularButtons.forEach(btn => {

    btn.addEventListener('click', () => {

      const key = btn.dataset.ocularPreset;

      const data = ocularPresets[key];

      if (!data) return;



      ocularButtons.forEach(b => b.setAttribute('aria-selected', String(b === btn)));

      if (ocularViewport) {

        ocularViewport.dataset.mag = data.mag;

        ocularViewport.dataset.focus = data.focus;

      }

      if (ocularImg) {

        ocularImg.src = data.img;

        ocularImg.alt = data.title;

      }

      if (ocularHudTop) ocularHudTop.textContent = data.hudTop;

      if (ocularHudBottom) ocularHudBottom.textContent = data.hudBottom;

      if (ocularTitle) ocularTitle.textContent = data.title;

      if (ocularDesc) ocularDesc.textContent = data.desc;

      if (ocularList) {

        ocularList.innerHTML = data.bullets.map(item => `<li><span>✓</span><div>${item}</div></li>`).join('');

      }

      if (ocularZoomBtn) {

        ocularZoomBtn.dataset.sample = data.sampleId;

        ocularZoomBtn.onclick = () => openSample(data.sampleId);

      }

    });

  });



  /* ========================================================================

     INTERACTIVE WIDGET 2: COMPARADOR LADO A LADO

     ======================================================================== */

  const compData = {

    'lev-hem': {

      sampleId: 'atlas-081',

      img: 'assets/samples/atlas-081.webp',

      badge: 'PÁGINA 81 · COMPARAÇÕES LADO A LADO',

      title: 'Leveduras × Hemácias isomórficas',

      subtitle: 'Estruturas incolores e arredondadas que frequentemente geram falso alerta de hematúria.',

      leftLabel: 'ESTRUTURA A · LEVEDURA',

      leftTitle: 'Brotamento e contorno ovoide',

      leftText: 'Procure uma gema aderida (brotamento), parede mais refringente e variação de calibre entre células próximas. Não sofre lise com ácido acético.',

      rightLabel: 'ESTRUTURA B · HEMÁCIA',

      rightTitle: 'Disco bicôncavo regular',

      rightText: 'Contorno circular uniforme, duplo halo ao mover o foco micrométrico e ausência de brotamentos. Correlaciona-se com sangue na tira.',

      alert: '<strong>Limite de bancada:</strong> Quando o brotamento não aparece no primeiro campo, varra campos adjacentes e cheque se a tira reagente é negativa para sangue.'

    },

    'muco-cil': {

      sampleId: 'atlas-083',

      img: 'assets/samples/atlas-083.webp',

      badge: 'PÁGINA 83 · COMPARAÇÕES LADO A LADO',

      title: 'Filamento de muco × Cilindro hialino',

      subtitle: 'Ambos têm baixo índice de refração e exigem condensador abaixado para visualização nítida.',

      leftLabel: 'ESTRUTURA A · FILAMENTO DE MUCO',

      leftTitle: 'Fita sinuosa e pontas afiladas',

      leftText: 'Espessura variável ao longo do trajeto, bordas onduladas ou desfiadas e extremidades que se abrem em fios finos.',

      rightLabel: 'ESTRUTURA B · CILINDRO HIALINO',

      rightTitle: 'Matriz com lados paralelos',

      rightText: 'Molde tubular homogêneo de proteína de Tamm-Horsfall, com largura constante e extremidades arredondadas bem delimitadas.',

      alert: '<strong>Limite de bancada:</strong> Confira as duas pontas e a continuidade das bordas em diferentes planos de foco antes de classificar como cilindro.'

    },

    'iso-dism': {

      sampleId: 'atlas-085',

      img: 'assets/samples/atlas-085.webp',

      badge: 'PÁGINA 85 · COMPARAÇÕES LADO A LADO',

      title: 'Hemácias isomórficas × dismórficas',

      subtitle: 'A distinção morfológica que orienta a investigação entre sangramento urológico e glomerular.',

      leftLabel: 'ESTRUTURA A · ISOMÓRFICA',

      leftTitle: 'Morfologia preservada e uniforme',

      leftText: 'Células com diâmetro regular, contorno liso (ou crenação fisiológica uniforme) e distribuição homogênea pelo campo.',

      rightLabel: 'ESTRUTURA B · DISMÓRFICA / ACANTÓCITO',

      rightTitle: 'Anéis deformados e vesículas (blebs)',

      rightText: 'Perda da regularidade do disco, fragmentação de membrana e projeções vesiculares características da passagem pela membrana basal glomerular.',

      alert: '<strong>Limite de bancada:</strong> O padrão populacional de várias células em múltiplos campos tem muito mais valor diagnóstico do que uma única hemácia isolada.'

    },

    'oxa-di-mono': {

      sampleId: 'atlas-087',

      img: 'assets/samples/atlas-087.webp',

      badge: 'PÁGINA 87 · COMPARAÇÕES LADO A LADO',

      title: 'Oxalato di-hidratado × monoidratado',

      subtitle: 'Duas apresentações cristalinas do mesmo sal que podem coexistir na mesma amostra.',

      leftLabel: 'ESTRUTURA A · DI-HIDRATADO (WEDDELLITA)',

      leftTitle: 'Envelope bipiramidal clássico',

      leftText: 'Octaedros transparentes com duas pirâmides unidas pela base, formando o "X" central característico ao ajustar o foco.',

      rightLabel: 'ESTRUTURA B · MONOIDRATADO (WHEWELLITA)',

      rightTitle: 'Discos ovais, halteres ou formas alongadas',

      rightText: 'Pequenos cristais ovoides ou bicôncavos fortemente birrefringentes que podem lembrar hemácias em campo claro.',

      alert: '<strong>Limite de bancada:</strong> Ambas as formas ocorrem em urina ácida ou neutra. Registre somente a forma efetivamente reconhecida no campo.'

    },

    'cil-pseudo': {

      sampleId: 'atlas-092',

      img: 'assets/samples/atlas-092.webp',

      badge: 'PÁGINA 92 · COMPARAÇÕES LADO A LADO',

      title: 'Cilindro verdadeiro × Pseudocilindro',

      subtitle: 'Como não confundir um cilindro granuloso ou celular real com um agregado alongado de uratos ou cristais.',

      leftLabel: 'ESTRUTURA A · CILINDRO VERDADEIRO',

      leftTitle: 'Matriz proteica contínua',

      leftText: 'Os grânulos ou células estão verdadeiramente imersos dentro de uma matriz cilíndrica com bordas laterais nítidas e contornos paralelos.',

      rightLabel: 'ESTRUTURA B · PSEUDOCILINDRO',

      rightTitle: 'Aglomerado casual sem matriz',

      rightText: 'Cristais amorfos, leucócitos ou artefatos empilhados em faixa, mas com bordas serrilhadas e sem membrana hialina envolvente.',

      alert: '<strong>Limite de bancada:</strong> Siga toda a extensão da estrutura pelo campo e verifique se há matriz verdadeira nas extremidades antes de laudar.'

    }

  };



  const compBtns = document.querySelectorAll('[data-comp-tab]');

  const compImg = $('comp-img');

  const compZoomBtn = $('comp-zoom-btn');

  const compBadge = $('comp-badge');

  const compTitle = $('comp-title');

  const compSubtitle = $('comp-subtitle');

  const compLeftLabel = $('comp-left-label');

  const compLeftTitle = $('comp-left-title');

  const compLeftText = $('comp-left-text');

  const compRightLabel = $('comp-right-label');

  const compRightTitle = $('comp-right-title');

  const compRightText = $('comp-right-text');

  const compAlert = $('comp-alert');



  compBtns.forEach(btn => {

    btn.addEventListener('click', () => {

      const key = btn.dataset.compTab;

      const d = compData[key];

      if (!d) return;



      compBtns.forEach(b => b.setAttribute('aria-selected', String(b === btn)));

      if (compImg) {

        compImg.src = d.img;

        compImg.alt = d.title;

        compImg.onclick = () => openSample(d.sampleId);

      }

      if (compZoomBtn) {

        compZoomBtn.dataset.sample = d.sampleId;

        compZoomBtn.onclick = () => openSample(d.sampleId);

      }

      if (compBadge) compBadge.textContent = d.badge;

      if (compTitle) compTitle.textContent = d.title;

      if (compSubtitle) compSubtitle.textContent = d.subtitle;

      if (compLeftLabel) compLeftLabel.textContent = d.leftLabel;

      if (compLeftTitle) compLeftTitle.textContent = d.leftTitle;

      if (compLeftText) compLeftText.textContent = d.leftText;

      if (compRightLabel) compRightLabel.textContent = d.rightLabel;

      if (compRightTitle) compRightTitle.textContent = d.rightTitle;

      if (compRightText) compRightText.textContent = d.rightText;

      if (compAlert) compAlert.innerHTML = d.alert;

    });

  });



  /* ========================================================================

     INTERACTIVE WIDGET 3: SIMULADOR DA TIRA REAGENTE × SEDIMENTO

     ======================================================================== */

  const dipstickData = {

    'sangue': {

      sampleId: 'atlas-022',

      img: 'assets/samples/atlas-022.webp',

      title: 'Sangue na Tira Reagente × Sedimento (Pág. 22)',

      detects: 'Atividade pseudoperoxidásica do grupo heme (hemácias íntegras, hemoglobina livre pós-lise ou mioglobina). Leitura em 60 segundos.',

      sediment: 'Procure hemácias isomórficas ou dismórficas em 400x, além de cilindros hemáticos em 100x.',

      divergence: 'Tira positiva com sedimento sem hemácias sugere lise celular (urina alcalina ou hipotônica) ou mioglobinúria. Ácido ascórbico (vitamina C) elevado pode causar falso-negativo na tira.'

    },

    'leucocitos': {

      sampleId: 'atlas-023',

      img: 'assets/samples/atlas-023.webp',

      title: 'Esterase Leucocitária × Leucócitos no Campo (Pág. 23)',

      detects: 'Enzimas esterases presentes nos grânulos azurófilos de granulócitos (neutrófilos íntegros ou lisados). Leitura em 120 segundos.',

      sediment: 'Quantifique leucócitos (piócitos) isolados ou em agrupamentos, cilindros leucocitários e flora bacteriana.',

      divergence: 'Linfócitos não produzem esterase leucocitária. Glicosúria elevada, alta densidade ou antibióticos (cefalexina, gentamicina) podem atenuar a reação na tira.'

    },

    'nitrito': {

      sampleId: 'atlas-023',

      img: 'assets/samples/atlas-023.webp',

      title: 'Nitrito na Tira × Bacteriúria no Sedimento (Pág. 23)',

      detects: 'Conversão do nitrato dietético em nitrito por bactérias Gram-negativas redutoras de nitrato (ex.: E. coli). Leitura em 60 segundos.',

      sediment: 'Observe bacilos ou cocos móveis/imóveis em 400x associados à presença de leucócitos.',

      divergence: 'Nitrito negativo NÃO exclui infecção: exige permanência urinária na bexiga (>4h), dieta com nitrato e bactéria redutora (Enterococcus e Staphylococcus são nitrito-negativos).'

    },

    'proteina': {

      sampleId: 'atlas-019',

      img: 'assets/samples/atlas-019.webp',

      title: 'Proteína na Tira × Cilindros no Sedimento (Pág. 19)',

      detects: 'Erro proteico dos indicadores de pH, altamente sensível à albumina urinária. Leitura em 60 segundos.',

      sediment: 'Inspecione cuidadosamente as bordas da lamínula em 100x em busca de cilindros hialinos, granulosos, céreos, epiteliais ou gordurosos.',

      divergence: 'Urina fortemente alcalina (pH > 8,0) ou contaminada por amônio quaternário pode gerar falso-positivo. A tira é pouco sensível a globulinas e cadeias leves.'

    },

    'ph': {

      sampleId: 'atlas-018',

      img: 'assets/samples/atlas-018.webp',

      title: 'pH Urinário × Classificação de Cristais (Pág. 18)',

      detects: 'Concentração hidrogeniônica entre pH 5,0 e 8,5 por duplo indicador (vermelho de metila e azul de bromotimol).',

      sediment: 'Cruze obrigatoriamente o pH com os cristais: ácido úrico, uratos amorfos e cistina predominam em pH ácido; estruvita e fosfatos amorfos em pH alcalino.',

      divergence: 'Amostra mantida em temperatura ambiente sofre alcalinização por urease bacteriana e perda de CO₂, favorecendo precipitação secundária de fosfatos e lise de cilindros.'

    },

    'densidade': {

      sampleId: 'atlas-016',

      img: 'assets/samples/atlas-016.webp',

      title: 'Densidade Urinária × Preservação Celular (Pág. 16)',

      detects: 'Concentração iônica da urina (1.000 a 1.030) por mudança de pKa de polieletrólito.',

      sediment: 'Em urina hiperconcentrada (>1.025), hemácias frequentemente sofrem crenação; em urina muito diluída (<1.008), ocorre intumescimento ("hemácias fantasma") e lise.',

      divergence: 'Tira reagente mede apenas solutos iônicos (não sofre interferência direta de glicose ou contraste radiológico como o refratômetro, mas varia com pH > 6,5).'

    },

    'glicose': {

      sampleId: 'atlas-020',

      img: 'assets/samples/atlas-020.webp',

      title: 'Glicose e Cetonas × Leveduras no Sedimento (Pág. 20)',

      detects: 'Glicose por reação enzimática dupla (glicose oxidase/peroxidase) e ácido acetoacético pela reação de Legal (nitroprussiato).',

      sediment: 'Amostras glicosúricas favorecem proliferação de leveduras (Candida spp.) com brotamentos e pseudo-hifas no sedimento.',

      divergence: 'Elevadas concentrações de ácido ascórbico ou corpos cetônicos podem reduzir a sensibilidade da área de glicose dependendo do fabricante.'

    },

    'bilirrubina': {

      sampleId: 'atlas-021',

      img: 'assets/samples/atlas-021.webp',

      title: 'Bilirrubina e Urobilinogênio × Elementos Corados (Pág. 21)',

      detects: 'Bilirrubina direta (conjugada) hidrossolúvel por sal de diazônio e urobilinogênio pelo reagente de Ehrlich.',

      sediment: 'A bilirrubinúria tinge intensamente células epiteliais, cilindros granulosos e cristais de cor amarelo-castanho/âmbar dourado.',

      divergence: 'A bilirrubina é extremamente fotossensível: exposição da amostra à luz oxida a bilirrubina em biliverdina, causando falso-negativo na tira.'

    }

  };



  const dipPads = document.querySelectorAll('[data-dipstick-pad]');

  const dipTitle = $('dip-title');

  const dipDetects = $('dip-detects');

  const dipSediment = $('dip-sediment');

  const dipDivergence = $('dip-divergence');

  const dipImg = $('dip-img');

  const dipZoomBtn = $('dip-zoom-btn');



  dipPads.forEach(pad => {

    pad.addEventListener('click', () => {

      const key = pad.dataset.dipstickPad;

      const d = dipstickData[key];

      if (!d) return;



      dipPads.forEach(p => p.setAttribute('aria-selected', String(p === pad)));

      if (dipTitle) dipTitle.textContent = d.title;

      if (dipDetects) dipDetects.textContent = d.detects;

      if (dipSediment) dipSediment.textContent = d.sediment;

      if (dipDivergence) dipDivergence.textContent = d.divergence;

      if (dipImg) {

        dipImg.src = d.img;

        dipImg.alt = d.title;

        dipImg.onclick = () => openSample(d.sampleId);

      }

      if (dipZoomBtn) {

        dipZoomBtn.dataset.sample = d.sampleId;

        dipZoomBtn.onclick = () => openSample(d.sampleId);

      }

    });

  });



  // Testimonials interactive drag/scroll

  const track = document.querySelector('.testimonials-track');

  if (track) {

    let isDown = false;

    track.addEventListener('mousedown', () => {

      isDown = true;

      track.style.cursor = 'grabbing';

      track.style.animationPlayState = 'paused';

    });

    window.addEventListener('mouseup', () => {

      if (!isDown) return;

      isDown = false;

      track.style.cursor = 'grab';

      track.style.animationPlayState = 'running';

    });

  }



    /* ========================================================================
     REDIRECIONAMENTO COM PASSAGEM FORÇADA DE PARÂMETROS DE URL
     (window.location.search -> window.location.href)
     ======================================================================== */
  const CHECKOUT_BASE_URL = 'https://pay.wiapy.com/6af0fe1d371815cbecca139b';

  function buildUrlWithParams(targetUrl) {
    const base = targetUrl || CHECKOUT_BASE_URL;
    const search = window.location.search || '';
    if (!search) return base;
    const cleanSearch = search.startsWith('?') ? search.substring(1) : search;
    if (!cleanSearch) return base;
    return base + (base.includes('?') ? '&' : '?') + cleanSearch;
  }

  function goToUrl(url, e) {
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault();
    }
    const finalUrl = buildUrlWithParams(url);
    if (typeof window.fbq === 'function') {
      try {
        window.fbq('track', 'InitiateCheckout');
      } catch (_) {}
    }
    window.location.href = finalUrl;
    return false;
  }

  window.buildCheckoutUrl = buildUrlWithParams;
  window.goToCheckout = function(e) {
    return goToUrl(CHECKOUT_BASE_URL, e);
  };

  function setupRedirects() {
    const redirectLinks = document.querySelectorAll('a[href*="pay.wiapy.com"], #cta-checkout, [data-checkout]');
    redirectLinks.forEach(link => {
      const targetUrl = link.getAttribute('href') || CHECKOUT_BASE_URL;
      link.href = buildUrlWithParams(targetUrl);
      link.addEventListener('click', function(e) {
        return goToUrl(this.getAttribute('href') || CHECKOUT_BASE_URL, e);
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupRedirects);
  } else {
    setupRedirects();
  }

})();