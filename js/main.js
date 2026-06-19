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
});
