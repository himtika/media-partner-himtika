(function($) {
	"use strict";
	
	//Hide Loading Box (Preloader)
	function handlePreloader() {
		if($('.preloader').length){
			$('body').addClass('page-loaded');
			$('.preloader').delay(1000).fadeOut(300);
		}
	}

	$(window).on('scroll', function() {
		var scrollPos = $(window).scrollTop();
		var btn = $('#backToTop');

		if (scrollPos > 300) {
			btn.addClass('show');
		} else {
			btn.removeClass('show');
		}
	});

	// Fungsi Klik: Balik ke Atas
	$('#backToTop').on('click', function(e) {
		e.preventDefault();
		window.scrollTo({
			top: 0,
			behavior: 'smooth'
		});
	});
	
	// Loading masuk page akan di gantikan dengan fungsi berikut
	
	$(window).on('load', function() {
		handlePreloader();
	});	
})(window.jQuery);

// ### NAVBAR
// Navbar Fixed
const navMenu = document.querySelector('#nav-menu');

function updateNavbar() {
    const header = document.querySelector("#navbar");

    if (window.scrollY <= 400) {

        header.classList.remove("navbar-fixed");
        header.classList.add("navbar-absolute");

        header.style.transform = "translateY(0)";
        header.style.opacity = "1";

    } else if (window.scrollY <= 600) {

        header.style.transform = "translateY(-10px)";
        header.style.opacity = "0";

        document.body.classList.remove("nav-open");
        navMenu.classList.remove("dropdown-appear");
        navMenu.classList.add("hidden");

    } else {

        header.classList.add("navbar-fixed");
        header.classList.remove("navbar-absolute");

        header.style.transform = "translateY(0)";
        header.style.opacity = "1";
    }
}

window.addEventListener("scroll", updateNavbar);
updateNavbar();

// Hamburger
const hamburger = document.querySelector('#hamburger');

hamburger.addEventListener('click' , function() {
    // hamburger.classList.toggle('hamburger-active');
    // navMenu.classList.toggle('hidden');
    const isMobile = window.innerWidth < 1024; // Tailwind 'lg' = 1024px

    if (navMenu.classList.contains("hidden")){
        document.body.classList.toggle('nav-open');
        navMenu.classList.remove("hidden");
        navMenu.classList.add('dropdown-appear');
        navMenu.style.transform = "translateY(-10px)";
        navMenu.style.opacity = "0";

        setTimeout(() => {
            navMenu.style.transform = "translateY(0)";
            navMenu.style.opacity = "1";
        }, 10);
    } else {
        if (isMobile) {
            navMenu.style.transform = "translateY(-10px)";
            navMenu.style.opacity = "0";
            document.body.classList.remove('nav-open');
            navMenu.classList.remove('dropdown-appear');
            setTimeout(() => {
                navMenu.classList.add("hidden");
            }, 300);
        }
    }
});

function updateNavMenuDisplay() {
    const isMobile = window.innerWidth < 1024;

    if (isMobile) {
        // Hanya tambahkan hidden jika menu belum dibuka (misalnya user belum klik hamburger)
        if (!document.body.classList.contains('nav-open')) {
            navMenu.classList.add("hidden");
        } else {
            navMenu.classList.remove('dropdown-appear');
            navMenu.classList.add("hidden");
            document.body.classList.remove('nav-open');
        }
    } else {
        navMenu.classList.remove('dropdown-appear');
        navMenu.classList.remove("hidden");
        navMenu.style.opacity = "1";
        navMenu.style.transform = "translateY(0)";
    }
}

// Jalankan saat halaman pertama kali dimuat
updateNavMenuDisplay();

// Jalankan juga saat ukuran layar berubah
window.addEventListener('resize', updateNavMenuDisplay);

// Menutup Navbar saat klik di luar kotak navbar
window.addEventListener("click", function (event) {
    const isMobile = window.innerWidth < 1024;

    // Cek: apakah klik di luar navMenu dan bukan pada hamburger
    if (
        isMobile &&
        !navMenu.contains(event.target) &&
        !hamburger.contains(event.target) &&
        !navMenu.classList.contains("hidden") // navbar sedang terbuka
    ) {
        // Tambahkan animasi keluar
        navMenu.style.transform = "translateY(-10px)";
        navMenu.style.opacity = "0";
        document.body.classList.remove('nav-open');
        navMenu.classList.remove('dropdown-appear');

        // Setelah animasi selesai (0.3 detik), sembunyikan menu
        setTimeout(() => {
            navMenu.classList.add("hidden");
        }, 300);
    }
});

document.addEventListener("DOMContentLoaded", function () {
    let showTermsBtn = document.getElementById("showTermsBtn");
    let homeNav = document.getElementById("home-nav");
    let aboutNav = document.getElementById("about-nav");
    let termsNav = document.getElementById("terms-nav");
    let heroSection = document.getElementById("hero-section");
    let aboutSection = document.getElementById("about-section");
    let termsSection = document.getElementById("term-and-conditions-section");

    showTermsBtn.addEventListener("click", function () {
        termsSection.scrollIntoView({ behavior: "smooth" });
    });
    homeNav.addEventListener("click", function () {
        heroSection.scrollIntoView({ behavior: "smooth" });
    });
    aboutNav.addEventListener("click", function () {
        aboutSection.scrollIntoView({ behavior: "smooth" });
    });
    termsNav.addEventListener("click", function () {
        termsSection.scrollIntoView({ behavior: "smooth" });
    });
});

document.addEventListener("DOMContentLoaded", () => {
    const termAccordions = document.querySelectorAll(".term-item .accordion-toggle");
    termAccordions.forEach((accordion) => {
        accordion.addEventListener("change", function () {
            // Tutup card Media Partner lainnya saat card ini diklik buka
            termAccordions.forEach((item) => {
                if (item !== this) item.checked = false;
            });
        });
    });
});

  // Mencegah Inspect Element dan View Source
  document.addEventListener("keydown", function (event) {
	if (
	  (event.ctrlKey &&
		(event.key === "u" ||
		  event.key === "i" ||
		  event.key === "j" ||
		  event.key === "s")) ||
	  (event.ctrlKey &&
		event.shiftKey &&
		(event.key === "I" || event.key === "J" || event.key === "C")) ||
	  event.key === "F12"
	) {
	  event.preventDefault();
	  console.log("Inspect Element telah dinonaktifkan!"); // Debugging
	}
  });
  // Mencegah Klik Kanan
  document.addEventListener("contextmenu", function (event) {
	event.preventDefault();
  });
  // Mencegah Drag & Drop pada Semua Gambar
  document.addEventListener("dragstart", function (event) {
	event.preventDefault();
  });
  // Mencegah Klik Kanan pada Gambar Secara Spesifik
  document.querySelectorAll("img").forEach((img) => {
	img.addEventListener("contextmenu", (event) => event.preventDefault());
  });

