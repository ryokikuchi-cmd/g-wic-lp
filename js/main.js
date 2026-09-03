document.addEventListener('DOMContentLoaded', function () {
  /* 求人詳細アコーディオン */
  var detailItems = document.querySelectorAll('.detail-item');
  detailItems.forEach(function (item) {
    var moreBtn = item.querySelector('.detail-more');
    var closeBtn = item.querySelector('.detail-close');

    if (moreBtn) {
      moreBtn.addEventListener('click', function () {
        item.classList.add('open');
      });
    }

    if (closeBtn) {
      closeBtn.addEventListener('click', function () {
        item.classList.remove('open');
      });
    }
  });

  /* チームカード展開 */
  var teamCards = document.querySelectorAll('.team-card');
  teamCards.forEach(function (card) {
    var moreBtn = card.querySelector('.team-more');
    var closeBtn = card.querySelector('.team-close');

    if (moreBtn) {
      moreBtn.addEventListener('click', function () {
        card.classList.add('open');
      });
    }

    if (closeBtn) {
      closeBtn.addEventListener('click', function () {
        card.classList.remove('open');
      });
    }
  });

  /* スムーズスクロール（PC時はスクロールコンテナ内で動作） */
  var links = document.querySelectorAll('a[href^="#"]');
  links.forEach(function (link) {
    link.addEventListener('click', function (e) {
      var href = link.getAttribute('href');
      if (!href || href === '#') return;
      var target = document.querySelector(href);
      if (!target) return;
      e.preventDefault();

      /* PC時: .page がスクロールコンテナなので、その中でスクロール */
      var isPC = window.innerWidth >= 850;
      if (isPC) {
        var scrollContainer = document.querySelector('.content-wrap .page');
        if (scrollContainer) {
          var targetTop = target.offsetTop - scrollContainer.offsetTop;
          scrollContainer.scrollTo({ top: targetTop, behavior: 'smooth' });
          return;
        }
      }
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  /* 応募フォーム → GAS（スプレッドシート）へ送信 → 完了ページ（Lead発火）へ遷移 */
  var entryForm = document.querySelector('.entry-form');
  if (entryForm) {
    var GAS_URL = 'https://script.google.com/macros/s/AKfycbyL9sQBr0gfRZuhJfYz-JEgbl1MzK3pxlXq5dOMn1Q8Vc6zvB_0FjWsBE23mQfYVwt1eQ/exec';
    entryForm.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!entryForm.checkValidity()) { entryForm.reportValidity(); return; }
      var btn = entryForm.querySelector('.entry-submit');
      if (btn) { btn.disabled = true; btn.textContent = '送信中…'; }
      var body = new URLSearchParams(new FormData(entryForm));
      body.append('page', location.href);
      try {
        fetch(GAS_URL, { method: 'POST', mode: 'no-cors', body: body, keepalive: true });
      } catch (err) {}
      /* keepaliveで送信を継続させつつ完了ページへ */
      setTimeout(function () { window.location.href = './thanks.html'; }, 400);
    });
  }
});
