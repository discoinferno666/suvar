const video = (file, label, className = '') => `<video class="${className}" controls playsinline preload="none" poster="assets/media/${file}-poster.jpg" aria-label="${label}" src="assets/media/${file}.mp4">Ваш браузер не поддерживает видео. <a href="assets/media/${file}.mp4">Скачать ролик</a></video>`;

export function renderVideoGallery() {
  return `<div class="gallery-media">${[['su-anasy', 'Су Анасы'], ['shurale', 'Шурале']].map(([file, label], index) => `<div class="gallery-slide" data-slide="${index}" role="group" aria-label="${label}">${video(file, label, 'gallery-video')}</div>`).join('')}</div>`;
}

export function renderCampaignResults(variant) {
  const id = `${variant}-campaign-rail`;
  return `<section class="campaign-results" aria-labelledby="${variant}-campaign-title"><h3 id="${variant}-campaign-title">Вот что у нас получилось</h3><div class="campaign-rail" id="${id}" tabindex="0" role="region" aria-label="Ролики для билбордов и фотография размещения">${[['billboard-shurale', 'Шурале'], ['billboard-su-anasy', 'Су Анасы'], ['billboard-zilant', 'Зилант']].map(([file, label]) => `<figure class="campaign-item">${video(file, `Билборд 6 × 3: ${label}`)}<figcaption>${label} · 6 × 3</figcaption></figure>`).join('')}<figure class="campaign-item"><button type="button" class="campaign-photo expandable" aria-label="Увеличить фотографию: Су Анасы на билборде"><img src="assets/media/su-anasy-billboard.png" alt="Билборд Суварстроит с Су Анасы и предложением купить квартиру" width="3840" height="2160" loading="lazy" decoding="async"></button><figcaption>Су Анасы на билборде</figcaption></figure></div><div class="campaign-controls"><button type="button" data-rail-direction="previous" aria-label="Предыдущий материал" aria-controls="${id}">←</button><button type="button" data-rail-direction="next" aria-label="Следующий материал" aria-controls="${id}">→</button></div></section>`;
}
