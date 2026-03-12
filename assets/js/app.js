/**
 * Nepal Constitution Explorer — app.js
 */

'use strict';

const state = {
  data: null,
  currentPartIndex: null,
  searchQuery: '',
  searchTimeout: null,
  suppressHistory: false,
};

const $ = id => document.getElementById(id);
const els = {
  partsNav:          $('partsNav'),
  welcomeScreen:     $('welcomeScreen'),
  partView:          $('partView'),
  partHeader:        $('partHeader'),
  articlesList:      $('articlesList'),
  searchView:        $('searchView'),
  searchViewTitle:   $('searchViewTitle'),
  searchResultsList: $('searchResultsList'),
  searchInput:       $('searchInput'),
  searchClear:       $('searchClear'),
  searchCount:       $('searchCount'),
  preambleText:      $('preambleText'),
  statParts:         $('statParts'),
  statArticles:      $('statArticles'),
  sidebar:           $('sidebar'),
};

async function init() {
  try {
    const res = await fetch('data/constitution.json');
    if (!res.ok) throw new Error('Failed to load constitution data');
    
    let rawText = await res.text();
    const replacements = {
      'नागररकिाबाट': 'नागरिकताबाट',
      'नागररकिा': 'नागरिकता',
      'नागररक': 'नागरिक',
      'मौमलक': 'मौलिक',
      'िक र': 'हक र',
      'िकको': 'हकको',
      'िकिरूको': 'हकहरूको',
      'िक ': 'हक ',
      'किव्व य': 'कर्तव्य',
      'िंशीय': 'वंशीय',
      'िथा': 'तथा',
      'लैंविक': 'लैंगिक',
      'पविचान': 'पहिचान',
      'सवििको': 'सहितको',
      'सविि': 'सहित',
      'िज‍च ि': 'वञ्चित',
      'नगररने': 'नगरिने',
      'मनदेशक': 'निर्देशक',
      'मसद्धान्ि': 'सिद्धान्त',
      'नीमि': 'नीति',
      'दावयत्ि': 'दायित्व',
      'प्रारजम्भक': 'प्रारम्भिक',
      'अमधिकार': 'अधिकार',
      'स्ििन्त्रिा': 'स्वतन्त्रता',
      'सािभव ौमसत्ता': 'सार्वभौमसत्ता',
      'राविय': 'राष्ट्रिय',
      'विि': 'हित',
      'स्िाधीनिा': 'स्वाधीनता',
      'आत्मसाि ्': 'आत्मसात्',
      'स‍ चालन': 'सञ्चालन',
      'अन्िरावविय': 'अन्तर्राष्ट्रिय',
      'स्िच्छ': 'स्वच्छ',
      'स्िास््य': 'स्वास्थ्य',
      'मविला': 'महिला',
      'दमलि': 'दलित',
      'िस्िु': 'वस्तु',
      'अिस्था': 'अवस्था',
      'व्यिस्था': 'व्यवस्था',
      'सिभामगिा': 'सहभागिता',
      'विमभन् न': 'विभिन्न',
      'संिधनव': 'संवर्द्धन',
      'क्षमिपूमि व': 'क्षतिपूर्ति',
      'प्राजप्ि': 'प्राप्ति',
      'किव्व य': 'कर्तव्य',
      'वििाि': 'विवाह',
      'मनकाय': 'निकाय',
      'जशिाचार': 'शिष्टाचार',
      'नैमिकिा': 'नैतिकता',
      'अमभिवृद्ध': 'अभिवृद्धि',
      'जीिन': 'जीवन',
      'सरु क्षा': 'सुरक्षा',
      'शाजन्ि': 'शान्ति',
      'सवुिधा': 'सुविधा',
      'मनिारक': 'निवारक',
      'स‍च ार': 'सञ्चार',
      'अमभयोग': 'अभियोग',
      'पाररश्रममक': 'पारिश्रमिक',
      'क्षमि': 'क्षति',
      'बमोजजम': 'बमोजिम',
      'प्रमिबन्ध': 'प्रतिबन्ध',
      'प्रमिविि': 'प्रतिहित',
      'उपलजब्ध': 'उपलब्धि',
      'अििेलना': 'अवहेलना',
      'अमभलेख': 'अभिलेख',
      'अमनिाय व': 'अनिवार्य',
      'राि': 'राष्ट्र',
      'रावियिा': 'राष्ट्रियता',
      'मनिावचन': 'निर्वाचन',
      'िामी': 'हामी',
      'सािभव ौमसत्तासम्पन् न': 'सार्वभौमसत्तासम्पन्न',
      'जनिा': 'जनता',
      'स्िायत्तिा': 'स्वायत्तता',
      'स्िशासनको': 'स्वशासनको',
      'गदै': 'गर्दै',
      'रािविि': 'राष्ट्रहित',
      'लोकिन्त्र': 'लोकतन्त्र',
      'पररििनव ': 'परिवर्तन',
      'ऐमििामसक': 'ऐतिहासिक',
      'गौरिपूण व': 'गौरवपूर्ण',
      'इमििासलाई': 'इतिहासलाई',
      'शिीदिरू': 'शहीदहरू',
      'पीमडि': 'पीडित',
      'सामन्िी': 'सामन्ती',
      'एिं ': 'एवं ',
      'िनु': 'हुनु',
      'िो': 'हो',
      'लामग': 'लागि',
      'त्यस्िो': 'त्यस्तो',
      'प्रमखु': 'प्रमुख',
      'प्रमिमनमध': 'प्रतिनिधि',
      'मनयजुक्त': 'नियुक्ति',
      'मनजको': 'निजको',
      'मख्ु': 'मुख्य',
      'अिस्थामा': 'अवस्थामा',
      'सेिा': 'सेवा',
      'बमोजजमको': 'बमोजिमको',
      'आमथकव': 'आर्थिक',
      'रिेको': 'रहेको',
      'सिोच्च': 'सर्वोच्च',
      'रािपमि': 'राष्ट्रपति',
      'सम्बजन्धि': 'सम्बन्धित',
      'राजनीमिक': 'राजनीतिक',
      'मनिावजचि': 'निर्वाचित',
      'प्रस्िाि': 'प्रस्ताव',
      'मनयक्तु': 'नियुक्त',
      'रािपमिले': 'राष्ट्रपतिले',
      'िर्': 'वर्ष',
      'पमन': 'पनि',
      'रिनेछ': 'रहनेछ',
      'अदालिको': 'अदालतको',
      'मसफाररसमा': 'सिफारिसमा',
      'पाररि': 'पारित',
      'आि‍यक': 'आवश्यक',
      'सभामखु': 'सभामुख',
      'मद्दु': 'मुद्दा',
      'देिायको': 'देहायको',
      'बािेक': 'बाहेक',
      'संिैधामनक': 'संवैधानिक',
      'अदालि': 'अदालत',
      'कम्िीमा': 'कम्तीमा',
      'रिी': 'रही',
      'मममिले': 'मितिले',
      'विर्यमा': 'विषयमा',
      'व्यिस्थापन': 'व्यवस्थापन',
      'मनणयव': 'निर्णय',
      'िँदु': 'हुँदै',
      'मसफाररस': 'सिफारिस',
      'सामाजजक': 'सामाजिक',
      'रिेका': 'रहेका',
      'मानि': 'मानव',
      'मनजले': 'निजले',
      'कारबािी': 'कारबाही',
      'पदािमध': 'पदावधि',
      'योग्यिा': 'योग्यता',
      'अमधकारको': 'अधिकारको',
      'अदालिमा': 'अदालतमा',
      'मलन': 'लिन',
      'बखि': 'बखत',
      'दमलि': 'दलित',
      'ित्काल': 'तत्काल',
      'उपसभामखु': 'उपसभामुख',
      'िर्कव': 'वर्षको',
      'मत्ृ': 'मृत्यु',
      'मलजखि': 'लिखित',
      'पदमक्तु': 'पदमुक्त',
      'विशेर्': 'विशेष',
      'बिमु': 'बहुमत',
      'बिाल': 'बहाल',
      'सम्पूण': 'सम्पूर्ण',
      'रिनेछन': 'रहनेछन्',
      'मनक': 'निक',
      'अमधिेशन': 'अधिवेशन',
      'सािजव': 'सार्वजनिक',
      'िापमन': 'तापनि',
      'दिु': 'दुई',
      'समािेशी': 'समावेशी',
      'मनधावरण': 'निर्धारण',
      'प्रिरी': 'प्रहरी',
      'मनयजुक्तका': 'नियुक्तिका',
      'विमनयोजन': 'विनियोजन',
      'समेि': 'समेत',
      'सािभव': 'सार्वभौम',
      'कायवविमध': 'कार्यविधि',
      'आि‍यकिा': 'आवश्यकता',
      'भौगोमलक': 'भौगोलिक',
      'प्रस्ििु': 'प्रस्तुत',
      'राजस्ि': 'राजस्व',
      'उपजस्थि': 'उपस्थित',
      'ददनमभत्र': 'दिनभित्र',
      'उजल्लजखि': 'उल्लिखित',
      'स्रोि': 'स्रोत',
      'प्रमिमनमधत्ि': 'प्रतिनिधित्व',
      'मिदान': 'मतदान',
      'उपप्रमखु': 'उपप्रमुख',
      'भएपमछ': 'भएपछि',
      'समन्िय': 'समन्वय',
      'मनज': 'निज',
      'मििाइ': 'मिलाई',
      'मिामभयोगको': 'महाभियोगको',
      'उपरािपमिको': 'उपराष्ट्रपतिको',
      'मिालेखा': 'महालेखा',
      'रािपमिको': 'राष्ट्रपतिको',
      'अदालिका': 'अदालतका',
      'प्रमििेदन': 'प्रतिवेदन',
      'मनकाय': 'निकाय',
      'अमधकारः': 'अधिकारः',
      'उपरािपमि': 'उपराष्ट्रपति',
      'िावर्कव': 'वार्षिक',
      'गाउँपामलका': 'गाउँपालिका',
      'िािािरण': 'वातावरण',
      'स्िीकृ': 'स्वीकृत',
      'अखण्डिा': 'अखण्डता',
      'पररििनव': 'परिवर्तन',
      'मनजामिी': 'निजामती',
      'मनजलाई': 'निजलाई',
      'नैमिक': 'नैतिक',
      'अध्यक्षिा': 'अध्यक्षता',
      'मजन्त्रपररर्दको': 'मन्त्रिपरिषद्को',
      'सम्पजत्त': 'सम्पत्ति',
      'समममि': 'समिति',
      'समाप्': 'समाप्त',
      'अदालिले': 'अदालतले',
      'बमोजजमका': 'बमोजिमका',
      'विचाराधीन': 'विचाराधीन',
      'स्ििः': 'स्वतः',
      'िडा': 'वडा',
      'स्नािक': 'स्नातक',
      'अपाििा': 'अपाङ्गता',
      'मानमसक': 'मानसिक',
      'ित्सम्बन्धी': 'तत्सम्बन्धी',
      'अजन्िम': 'अन्तिम',
      'कायावन्ियन': 'कार्यान्वयन',
      'नरिेको': 'नरहेको',
      'समममिको': 'समितिको',
      'अन्िेर्ण': 'अन्वेषण',
      'असमथ': 'असमर्थ',
      'अिस्थाको': 'अवस्थाको',
      'आददिासी': 'आदिवासी',
      'समानपु ामिक': 'समानुपातिक',
      'दस्िरु': 'दस्तुर',
      'अजख्ियार': 'अख्तियार',
      'सियोग': 'सहयोग',
      'धाममकव': 'धार्मिक',
      'उम्मेदिार': 'उम्मेदवार',
      'गम्भीर': 'गम्भीर',
      'मिान्यायामधिक्ताको': 'महान्यायाधिवक्ताको',
      'पूमि': 'पूर्ति',
      'मनिाचव': 'निर्वाचन',
      'अदालिबाट': 'अदालतबाट',
      'लगायि': 'लगायत',
      'संिधनव': 'संवर्धन',
      'मनदेशन': 'निर्देशन',
      'समािेश': 'समावेश',
      'परामश': 'परामर्श',
      'जािीय': 'जातीय',
      'देिायका': 'देहायका',
      'जामि': 'जाति',
      'मनयन्त्रण': 'नियन्त्रण',
      'नीमिः': 'नीतिः',
      'मामननेछ': 'मानिनेछ',
      'सिकारी': 'सहकारी',
      'प्राथममकिा': 'प्राथमिकता',
      'अिलम्बन': 'अवलम्बन',
      'विद्यिु': 'विद्युत्',
      'सिायक': 'सहायक',
      'मनिावचनको': 'निर्वाचनको',
      'आधारभिू': 'आधारभूत',
      'अस्िस्थिाको': 'अस्वस्थताको',
      'मजुस्लम': 'मुस्लिम',
      'व्यिस्थावपका–संसदको': 'व्यवस्थापिका–संसदको',
      'जनजामि': 'जनजाति',
      'पिँचु': 'पहुँच',
      'िोवकएको': 'तोकिएको',
      'मनविि': 'निहित',
      'अमिररक्त': 'अतिरिक्त',
      'िाहरु': 'वाहरु'
    };
    
    for (const [bad, good] of Object.entries(replacements)) {
      rawText = rawText.split(bad).join(good);
    }
    
    state.data = JSON.parse(rawText);
    render();
    handleHashNavigation();
  } catch (err) {
    if ($('mainContent')) {
      $('mainContent').innerHTML = `
        <div style="display:flex;align-items:center;justify-content:center;height:100%;text-align:center;">
          <div><h2 style="color:var(--accent);">⚠️ Setup Error</h2><p style="color:var(--text-muted);">${err.message}</p></div>
        </div>`;
    }
  }
}

function render() {
  const { data } = state;
  if (!data) return;

  if (els.statParts) els.statParts.textContent = toNepaliNum(data.parts.length);
  if (els.statArticles) els.statArticles.textContent = toNepaliNum(data.parts.reduce((a, p) => a + p.articles.length, 0));
  if (els.preambleText) els.preambleText.textContent = data.preamble || '(Preamble not available)';

  if (els.partsNav) {
    els.partsNav.innerHTML = '';
    data.parts.forEach((part, idx) => {
      const item = document.createElement('div');
      item.className   = 'part-nav-item';
      item.dataset.idx = idx;
      item.innerHTML = `
        <span class="part-nav-num">${toNepaliNum(part.part_number)}</span>
        <div class="part-nav-titles">
          <div class="part-nav-np">${part.title_np}</div>
          ${part.title_en ? `<div class="part-nav-en">${part.title_en}</div>` : ''}
        </div>
        <span class="part-nav-count">${toNepaliNum(part.articles.length)}</span>
      `;
      item.addEventListener('click', () => {
        showPart(idx);
        closeMobileSidebar();
      });
      els.partsNav.appendChild(item);
    });
  }

  if (els.searchInput) els.searchInput.addEventListener('input', onSearch);
  if (els.searchClear) els.searchClear.addEventListener('click', clearSearch);

  setupMobileSidebar();

  const toast = document.createElement('div');
  toast.id        = 'toast';
  toast.className = 'toast';
  document.body.appendChild(toast);
}

function handleHashNavigation() {
  const hash = window.location.hash;
  if (!hash || hash === '#') return showWelcome(false);

  const match = hash.match(/^#(part|article)\/(\d+)$/);
  if (!match) return showWelcome(false);

  const type  = match[1];
  const value = parseInt(match[2], 10);
  const { data } = state;
  if (!data) return;

  if (type === 'part') {
    const partIdx = data.parts.findIndex(p => p.part_number === value);
    if (partIdx !== -1) showPart(partIdx, false);
    else showWelcome(false);
  } else if (type === 'article') {
    let foundPartIdx = -1;
    for (let i = 0; i < data.parts.length; i++) {
      if (data.parts[i].articles.find(a => a.article_number === value)) {
        foundPartIdx = i; break;
      }
    }
    if (foundPartIdx !== -1) {
      showPart(foundPartIdx, false);
      requestAnimationFrame(() => {
        const artEl = document.getElementById(`article-${value}`);
        if (artEl) {
          artEl.classList.add('expanded', 'deep-linked');
          artEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          artEl.addEventListener('animationend', () => artEl.classList.remove('deep-linked'), { once: true });
        }
      });
    } else {
      showWelcome(false);
    }
  }
}

function pushHash(hash) {
  if (state.suppressHistory) return;
  if (window.location.hash !== hash) history.pushState(null, '', hash);
}

window.addEventListener('popstate', () => {
  state.suppressHistory = true;
  handleHashNavigation();
  state.suppressHistory = false;
});

function showPart(idx, updateHash = true) {
  const { data } = state;
  const part = data.parts[idx];
  state.currentPartIndex = idx;

  if (updateHash) pushHash(`#part/${part.part_number}`);

  document.querySelectorAll('.part-nav-item').forEach((el, i) => {
    el.classList.toggle('active', i === idx);
  });

  if (els.welcomeScreen) els.welcomeScreen.style.display = 'none';
  if (els.searchView) els.searchView.style.display    = 'none';
  if (els.partView) els.partView.style.display      = 'block';

  if (state.searchQuery) clearSearch();

  const isFirst = idx === 0;
  const isLast  = idx === data.parts.length - 1;

  if (els.partHeader) {
    els.partHeader.innerHTML = `
      <div class="part-breadcrumb">नेपालको संविधान › भाग ${toNepaliNum(part.part_number)}</div>
      <h2 class="part-title-np">${part.title_np}</h2>
      ${part.title_en ? `<p class="part-title-en">${part.title_en}</p>` : ''}
      <div class="part-meta-row">
        <span class="glass-badge highlight-badge">भाग ${toNepaliNum(part.part_number)} · Part ${part.part_number}</span>
        <span class="glass-badge">${toNepaliNum(part.articles.length)} धाराहरू · Articles</span>
        <div class="part-nav-arrows">
          <button class="glass-btn part-nav-arrow" onclick="showPart(${idx - 1})" ${isFirst ? 'disabled' : ''}>← अघिल्लो (Prev)</button>
          <button class="glass-btn part-nav-arrow" onclick="showPart(${idx + 1})" ${isLast  ? 'disabled' : ''}>अर्को (Next) →</button>
        </div>
      </div>
    `;
  }

  if (els.articlesList) {
    els.articlesList.innerHTML = '';
    part.articles.forEach((article, aIdx) => {
      const card = buildArticleCard(article, idx, aIdx);
      els.articlesList.appendChild(card);
    });
    els.articlesList.parentElement.scrollTop = 0;
  }
}

function buildArticleCard(article, partIdx, aIdx, highlight = '') {
  const card    = document.createElement('div');
  card.className = 'article-card';
  card.id        = `article-${article.article_number}`;

  const enTitle        = article.title_en   || '';
  const enContent      = article.content_en || '';
  const displayContent = enContent || article.content || '';

  let previewText = displayContent
    ? displayContent.substring(0, 140).replace(/\n/g, ' ') + (displayContent.length > 140 ? '…' : '')
    : '';
  let contentFormatted = formatArticleContent(displayContent, highlight);
  const articleURL = `${location.href.split('#')[0]}#article/${article.article_number}`;

  card.innerHTML = `
    <div class="article-header" role="button" aria-expanded="false">
      <div class="article-num-badge">
        <span class="np-num">${article.article_number_np || article.article_number}</span>
        <span class="art-num">Art. ${article.article_number}</span>
      </div>
      <div class="article-title-block">
        <div class="article-title-en">${highlight ? highlightText(enTitle || article.title_np, highlight) : (enTitle || escapeHTML(article.title_np))}</div>
        ${article.title_np ? `<div class="article-title-np-sub">${highlight ? highlightText(article.title_np, highlight) : escapeHTML(article.title_np)}</div>` : ''}
        <div class="article-title-preview">${highlight ? highlightText(previewText, highlight) : escapeHTML(previewText)}</div>
      </div>
      <span class="article-expand-icon">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
      </span>
    </div>
    <div class="article-body">
      <div class="article-content">${contentFormatted}</div>
      <div class="article-footer">
        <span class="article-ref-label">सन्दर्भ (Reference)</span>
        <span class="article-dharaa">धारा ${toNepaliNum(article.article_number_np || article.article_number)}</span>
        <button class="article-share-btn" data-url="${escapeHTML(articleURL)}" title="Copy link">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
          </svg>
          लिङ्क प्रतिलिपि गर्नुहोस् (Copy link)
        </button>
      </div>
    </div>
  `;

  const header = card.querySelector('.article-header');
  header.addEventListener('click', () => {
    const expanded = card.classList.toggle('expanded');
    header.setAttribute('aria-expanded', expanded);
    if (expanded) pushHash(`#article/${article.article_number}`);
    else if (state.currentPartIndex !== null) pushHash(`#part/${state.data.parts[state.currentPartIndex].part_number}`);
  });

  card.querySelector('.article-share-btn').addEventListener('click', e => {
    e.stopPropagation();
    copyToClipboard(e.currentTarget.dataset.url);
  });

  return card;
}

function formatArticleContent(content, highlight = '') {
  if (!content) return '';
  let formatted = escapeHTML(content);
  if (highlight) formatted = highlightText(formatted, highlight);
  return formatted.replace(/(\([\s\S]{1,4}?\))/g, (match) => {
    if (/^\([०-९क-ह\d]+\)$/.test(match.trim())) return `\n${match}`;
    return match;
  });
}

function copyToClipboard(text) {
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(text)
      .then(() => showToast('✓ लिङ्क प्रतिलिपि भयो (Link copied)'))
      .catch(() => showToast('प्रतिलिपि गर्न असफल (Copy failed)'));
  } else {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); showToast('✓ लिङ्क प्रतिलिपि भयो (Link copied)'); }
    catch { showToast('प्रतिलिपि गर्न असफल (Copy failed)'); }
    document.body.removeChild(ta);
  }
}

let toastTimer = null;
function showToast(message) {
  const toast = $('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2400);
}

function onSearch(e) {
  const query = e.target.value.trim();
  state.searchQuery = query;
  if (els.searchClear) els.searchClear.classList.toggle('visible', query.length > 0);
  clearTimeout(state.searchTimeout);

  if (!query) return clearSearch();
  state.searchTimeout = setTimeout(() => performSearch(query), 200);
}

function performSearch(query) {
  const { data } = state;
  const q       = query.toLowerCase();
  const results = [];

  data.parts.forEach((part, partIdx) => {
    part.articles.forEach((article, aIdx) => {
      if (
        article.title_np?.toLowerCase().includes(q) ||
        article.title_en?.toLowerCase().includes(q) ||
        article.content?.toLowerCase().includes(q) ||
        article.content_en?.toLowerCase().includes(q) ||
        part.title_en?.toLowerCase().includes(q)
      ) {
        results.push({ part, partIdx, article, aIdx });
      }
    });
  });

  if (els.searchCount) els.searchCount.textContent = results.length > 0 ? `${toNepaliNum(results.length)} नतिजा(हरू) / result(s)` : '';

  if (els.welcomeScreen) els.welcomeScreen.style.display = 'none';
  if (els.partView) els.partView.style.display      = 'none';
  if (els.searchView) els.searchView.style.display    = 'block';

  if (els.searchViewTitle) {
    els.searchViewTitle.textContent = results.length ? `"${query}" को लागि ${toNepaliNum(results.length)} नतिजा(हरू) / result(s)` : `कुनै नतिजा फेला परेन। (No results found.)`;
  }

  if (els.searchResultsList) {
    els.searchResultsList.innerHTML = '';
    results.forEach(({ part, partIdx, article }) => {
      const card = document.createElement('div');
      card.className = 'search-result-card glass-panel';
      card.style.marginBottom = '12px';
      
      const excerpt = (article.content_en || article.content) ? getExcerpt(article.content_en || article.content, query, 160) : '';

      card.innerHTML = `
        <div class="search-result-header">
          <span>भाग ${toNepaliNum(part.part_number)} · ${part.title_en || part.title_np}</span>
          <span>धारा ${toNepaliNum(article.article_number)}</span>
        </div>
        <div class="search-result-title">${highlightText(article.title_en || article.title_np, query)}</div>
        ${article.title_np ? `<div class="search-result-np">${escapeHTML(article.title_np)}</div>` : ''}
        <div class="search-result-excerpt">${highlightText(excerpt, query)}</div>
      `;

      card.addEventListener('click', () => {
        clearSearch();
        showPart(partIdx);
        setTimeout(() => {
          const artEl = document.getElementById(`article-${article.article_number}`);
          if (artEl) {
            artEl.classList.add('expanded');
            artEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            pushHash(`#article/${article.article_number}`);
          }
        }, 100);
      });
      els.searchResultsList.appendChild(card);
    });
  }
}

function getExcerpt(text, query, maxLen) {
  const q   = query.toLowerCase();
  const idx = text.toLowerCase().indexOf(q);
  if (idx === -1) return text.substring(0, maxLen) + (text.length > maxLen ? '…' : '');
  const start   = Math.max(0, idx - 60);
  const end     = Math.min(text.length, idx + maxLen - 60);
  return (start > 0 ? '…' : '') + text.substring(start, end) + (end < text.length ? '…' : '');
}

function clearSearch() {
  if (els.searchInput) els.searchInput.value = '';
  state.searchQuery = '';
  if (els.searchClear) els.searchClear.classList.remove('visible');
  if (els.searchCount) els.searchCount.textContent = '';
  if (state.currentPartIndex !== null) showPart(state.currentPartIndex);
  else showWelcome();
}

function showWelcome(updateHash = true) {
  if (els.welcomeScreen) els.welcomeScreen.style.display = 'block';
  if (els.partView) els.partView.style.display = 'none';
  if (els.searchView) els.searchView.style.display = 'none';
  document.querySelectorAll('.part-nav-item').forEach(el => el.classList.remove('active'));
  state.currentPartIndex = null;
  if (updateHash) pushHash('#');
}

function setupMobileSidebar() {
  const headerInner = document.querySelector('.header-inner');
  if (headerInner && !document.querySelector('.mobile-menu-btn')) {
    const mobileMenuBtn = document.createElement('button');
    mobileMenuBtn.className = 'glass-btn icon-btn mobile-menu-btn';
    mobileMenuBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>`;
    mobileMenuBtn.style.display = 'none';
    
    const checkMobile = () => { mobileMenuBtn.style.display = window.innerWidth <= 900 ? 'flex' : 'none'; };
    window.addEventListener('resize', checkMobile); checkMobile();
    
    mobileMenuBtn.addEventListener('click', () => { if(els.sidebar) els.sidebar.classList.add('open'); });
    headerInner.insertBefore(mobileMenuBtn, headerInner.firstChild);
    
    const closeBtn = $('sidebarToggleClose');
    if (closeBtn) closeBtn.addEventListener('click', closeMobileSidebar);
  }
}

function closeMobileSidebar() { if (els.sidebar) els.sidebar.classList.remove('open'); }

function escapeHTML(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function highlightText(text, query) {
  if (!query || !text) return escapeHTML(text);
  const escaped = escapeHTML(text); const q = escapeHTML(query);
  const regex = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  return escaped.replace(regex, '<mark>$1</mark>');
}
function toNepaliNum(num) {
  const nepali = ['०','१','२','३','४','५','६','७','८','९'];
  return String(num).split('').map(d => nepali[parseInt(d)] || d).join('');
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  try { localStorage.setItem('np-const-theme', theme); } catch (e) {}
}
function initTheme() {
  let saved = null; try { saved = localStorage.getItem('np-const-theme'); } catch (e) {}
  applyTheme(saved || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
  const btn = $('themeToggle');
  if (btn) btn.addEventListener('click', () => {
    applyTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
  });
}

(function () {
  let saved = null; try { saved = localStorage.getItem('np-const-theme'); } catch (e) {}
  document.documentElement.setAttribute('data-theme', saved || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
}());

document.addEventListener('DOMContentLoaded', () => { initTheme(); init(); });
