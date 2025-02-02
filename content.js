// Önceki mouseover/mouseout event listener'ları kaldırılabilir, 
// çünkü artık preview özelliğini kullanmayacağız

// Tüm video linklerinin href'lerini kaldır ve modal ekle
function processVideoLinks() {
  // Tüm video linklerini seç (hem sidebar hem ana grid için)
  const videoLinks = document.querySelectorAll(`
    a.yt-simple-endpoint.style-scope.ytd-compact-video-renderer,
    a.yt-simple-endpoint.focus-on-expand.style-scope.ytd-rich-grid-media
  `);
  
  videoLinks.forEach(link => {
    // href'i hemen kaldır
    if (link.hasAttribute('href')) {
      link.dataset.videoUrl = link.href;
      link.removeAttribute('href');
      link.style.cursor = 'pointer';
      
      // Tüm click event'lerini engelle
      link.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }, true);
    }

    // Modal listener'ı ekle
    if (!link.dataset.hasModalListener) {
      link.dataset.hasModalListener = 'true';
      
      // Click handler'ı capture phase'de ekle
      link.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        try {
          const videoUrl = this.dataset.videoUrl;
          const url = new URL(videoUrl);
          const videoId = url.searchParams.get('v');
          
          const modal = document.createElement('div');
          modal.className = 'netflix-modal';
          modal.innerHTML = `
            <div class="netflix-modal-content">
              <button class="netflix-close-button">✕</button>
              <button class="netflix-minimize-button">▼</button>
              <div class="netflix-iframe-container">
                <iframe
                  class="netflix-iframe"
                  src="https://www.youtube.com/embed/${videoId}?autoplay=1"
                  allow="autoplay; encrypted-media"
                  allowfullscreen
                ></iframe>
              </div>
            </div>
          `;

          document.body.appendChild(modal);
          
          // Animasyon için bir tick bekle
          requestAnimationFrame(() => {
            modal.classList.add('show');
          });

          // Minimize butonu işlevi
          const minimizeButton = modal.querySelector('.netflix-minimize-button');
          minimizeButton.onclick = () => {
            const isMinimized = modal.classList.contains('minimized');
            
            if (isMinimized) {
              // Büyütme
              modalContent.classList.add('maximizing');
              modal.classList.remove('minimized');
              minimizeButton.textContent = '▼';
              
              setTimeout(() => {
                modalContent.classList.remove('maximizing');
                modalContent.style.removeProperty('--mouse-x');
                modalContent.style.removeProperty('--mouse-y');
                setTranslate(0, 0, modalContent);
              }, 300);
            } else {
              // Küçültme
              modal.classList.add('minimized');
              minimizeButton.textContent = '▲';
              modalContent.style.setProperty('--mouse-x', '0px');
              modalContent.style.setProperty('--mouse-y', '0px');
              setTranslate(0, 0, modalContent);
            }
          };

          // Klavye kontrollerini ekle
          const handleKeyPress = (e) => {
            if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
              e.preventDefault();
              e.stopPropagation();
              
              // Minimize butonunun click eventini tetikle
              if ((e.key === 'ArrowDown' && !modal.classList.contains('minimized')) ||
                  (e.key === 'ArrowUp' && modal.classList.contains('minimized'))) {
                minimizeButton.click();
              }
            }
          };

          document.addEventListener('keydown', handleKeyPress);

          // Kapatma işlevleri
          modal.querySelector('.netflix-close-button').onclick = () => {
            modal.classList.remove('show');
            document.removeEventListener('keydown', handleKeyPress);
            setTimeout(() => modal.remove(), 300);
          };

          modal.onclick = (e) => {
            if (e.target === modal && !modal.classList.contains('minimized')) {
              modal.classList.remove('show');
              document.removeEventListener('keydown', handleKeyPress);
              setTimeout(() => modal.remove(), 300);
            }
          };

          document.addEventListener('keydown', function closeOnEsc(e) {
            if (e.key === 'Escape') {
              modal.classList.remove('show');
              document.removeEventListener('keydown', handleKeyPress);
              document.removeEventListener('keydown', closeOnEsc);
              setTimeout(() => modal.remove(), 300);
            }
          });

          // Sürükleme işlevi
          const modalContent = modal.querySelector('.netflix-modal-content');
          let isDragging = false;
          let currentX;
          let currentY;
          let initialX;
          let initialY;
          let xOffset = 0;
          let yOffset = 0;

          modalContent.addEventListener('mousedown', dragStart);
          document.addEventListener('mousemove', drag);
          document.addEventListener('mouseup', dragEnd);

          function dragStart(e) {
            if (!modal.classList.contains('minimized')) return;
            
            // Sadece content veya iframe container'a tıklandığında sürüklemeye izin ver
            if (e.target === modalContent || e.target.closest('.netflix-iframe-container')) {
              isDragging = true;
              modal.classList.add('dragging');
              
              // Mevcut transform pozisyonunu al
              const style = window.getComputedStyle(modalContent);
              const matrix = new WebKitCSSMatrix(style.transform);
              
              // Başlangıç offset'lerini ayarla
              xOffset = matrix.m41;
              yOffset = matrix.m42;
              initialX = e.clientX - xOffset;
              initialY = e.clientY - yOffset;
              
              modalContent.style.transition = 'none';
            }
          }

          function drag(e) {
            if (!isDragging) return;
            
            e.preventDefault();
            
            currentX = e.clientX - initialX;
            currentY = e.clientY - initialY;
            
            // Ekran sınırları içinde tut
            const rect = modalContent.getBoundingClientRect();
            const maxX = window.innerWidth - rect.width;
            const maxY = window.innerHeight - rect.height;
            
            xOffset = Math.max(0, Math.min(currentX, maxX));
            yOffset = Math.max(0, Math.min(currentY, maxY));
            
            // CSS değişkenlerini güncelle
            modalContent.style.setProperty('--mouse-x', `${xOffset}px`);
            modalContent.style.setProperty('--mouse-y', `${yOffset}px`);
            setTranslate(xOffset, yOffset, modalContent);
          }

          function dragEnd() {
            if (!isDragging) return;
            
            isDragging = false;
            modal.classList.remove('dragging');
            
            // Smooth animasyon ekle
            modalContent.style.transition = 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)';
            
            // Son pozisyonu kaydet
            const finalX = xOffset;
            const finalY = yOffset;
            
            requestAnimationFrame(() => {
              setTranslate(finalX, finalY, modalContent);
            });
          }

          function setTranslate(xPos, yPos, el) {
            el.style.transform = `translate(${xPos}px, ${yPos}px)`;
          }
        } catch (error) {
          console.error('Hata:', error);
        }
      }, true);
    }
  });
}

// Sayfa yüklendiğinde çalıştır
processVideoLinks();

// YouTube'un dinamik yüklenen içeriği için MutationObserver kullan
const observer = new MutationObserver((mutations) => {
  mutations.forEach(mutation => {
    if (mutation.addedNodes.length) {
      processVideoLinks();
    }
  });
});

// Tüm DOM değişikliklerini izle
observer.observe(document.body, {
  childList: true,
  subtree: true
});

// Sayfa yüklenirken sürekli kontrol et (ilk yüklemede bazı linkler kaçabilir)
const interval = setInterval(() => {
  const links = document.querySelectorAll(`
    a.yt-simple-endpoint.style-scope.ytd-compact-video-renderer[href],
    a.yt-simple-endpoint.focus-on-expand.style-scope.ytd-rich-grid-media[href]
  `);
  if (links.length > 0) {
    processVideoLinks();
  }
}, 100);

// 5 saniye sonra interval'i temizle
setTimeout(() => clearInterval(interval), 5000); 