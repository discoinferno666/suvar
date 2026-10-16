const video = (file, label, preview = false) => `<video class="${preview ? 'gallery-video' : 'campaign-video'}" muted loop playsinline preload="metadata" poster="assets/media/${file}-poster.jpg" aria-label="${label}" src="assets/media/${file}.mp4">Ваш браузер не поддерживает видео. <a href="assets/media/${file}.mp4">Скачать ролик</a></video>`;

export function renderVideoGallery() {
  return `<div class="gallery-media">${[['su-anasy', 'Су Анасы'], ['shurale', 'Шурале']].map(([file, label], index) => `<div class="gallery-slide" data-slide="${index}" role="group" aria-label="${label}">${video(file, label, true)}<button type="button" class="gallery-play" data-video-label="${label}" aria-label="Смотреть видео: ${label}"><span aria-hidden="true">▶</span><span class="sr-only">Смотреть видео</span></button></div>`).join('')}</div>`;
}

export function renderCampaignRail(variant) {
  const slots = variant === 'desktop' ? ['61:23', '61:24', '61:25'] : [];
  return `<div class="campaign-rail" id="${variant}-campaign-rail" tabindex="0" role="region" aria-label="Ролики для билбордов и фотография размещения">${[['billboard-shurale', 'Шурале'], ['billboard-zilant', 'Зилант'], ['billboard-su-anasy', 'Су Анасы']].map(([file, label], index) => `<figure class="campaign-item" ${slots[index] ? `data-node-id="${slots[index]}"` : ''}>${video(file, `Билборд 6 × 3: ${label}`)}</figure>`).join('')}<figure class="campaign-item"><button type="button" class="campaign-photo expandable" aria-label="Увеличить фотографию: Су Анасы на билборде"><img src="assets/media/su-anasy-billboard.png" alt="Билборд Суварстроит с Су Анасы и предложением купить квартиру" width="3840" height="2160" loading="lazy" decoding="async"></button></figure></div><input class="campaign-scrollbar" type="range" min="0" max="100" step="1" value="0" aria-label="Прокрутить ролики и фотографию" aria-controls="${variant}-campaign-rail">`;
}

export function renderMobileCampaignResults() {
  return `<section class="campaign-results" aria-label="Ролики для наружной рекламы">${renderCampaignRail('mobile')}</section><h3 class="campaign-billboard-title">Наши персонажи на билбордах:</h3>`;
}
