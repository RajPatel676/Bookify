(function ($) {
    "use strict";

    // Initiate the wowjs - will be initialized after page fully loads
    // (Initialization moved to window.load event at bottom of file)


    // Sticky Navbar
    $(window).scroll(function () {
        if ($(this).scrollTop() > 45) {
            $('.navbar').addClass('sticky-top shadow-sm');
        } else {
            $('.navbar').removeClass('sticky-top shadow-sm');
        }
    });



    // Back to top button
    $(window).scroll(function () {
        if ($(this).scrollTop() > 300) {
            $('.back-to-top').fadeIn('slow');
        } else {
            $('.back-to-top').fadeOut('slow');
        }
    });
    $('.back-to-top').click(function () {
        $('html, body').animate({ scrollTop: 0 }, 0, 'easeInOutExpo');
        return false;
    });


    // Facts counter
    $('[data-toggle="counter-up"]').counterUp({
        delay: 0.5,
        time: 1500
    });


    // Modal Video
    $(document).ready(function () {
        var $videoSrc;
        $('.btn-play').click(function () {
            $videoSrc = $(this).data("src");
        });
        console.log($videoSrc);

        $('#videoModal').on('shown.bs.modal', function (e) {
            $("#video").attr('src', $videoSrc + "?autoplay=1&amp;modestbranding=1&amp;showinfo=0");
        })

        $('#videoModal').on('hide.bs.modal', function (e) {
            $("#video").attr('src', $videoSrc);
        })
    });


    // Testimonials carousel
    $(".testimonial-carousel").owlCarousel({
        autoplay: true,
        smartSpeed: 1000,
        center: true,
        margin: 24,
        dots: true,
        loop: true,
        nav: false,
        responsive: {
            0: {
                items: 1
            },
            768: {
                items: 2
            },
            992: {
                items: 3
            }
        }
    });

})(jQuery);

window.onload = async () => {
    const profileButton = document.getElementById('profile-button');
    const loginButton = document.getElementById('login-button');

    try {
        const response = await fetch('/check-auth');
        const data = await response.json();

        if (data.isLoggedIn) {

            // loginButton.style.display = 'none';
            // profileButton.style.display = 'block';


            profileButton.addEventListener('click', () => {
                window.location.href = '/profile';
            });
        } else {
            // User is not logged in
            // loginButton.style.display = 'block';
            profileButton.style.display = 'none';
        }
    } catch (error) {
        console.error('Error checking auth status:', error);
    }
};

fetch('/session-status')
    .then(response => response.json())
    .then(data => {
        const profileButton = document.getElementById('profile-button');
        const loginButton = document.getElementById('login-button');

        // If the user is logged in, show the profile icon
        if (data.loggedIn) {
            profileButton.style.display = 'inline';
            loginButton.style.display = 'none';
        } else {
            profileButton.style.display = 'none';
            loginButton.style.display = 'inline';
            loginButton.style.margin = '0px 0px 0px 25px';
        }
    });

// Filter button 
const filterButtons = document.querySelectorAll('.filter-btn');
const carousels = document.querySelectorAll('.carousel');

filterButtons.forEach(button => {
    button.addEventListener('click', () => {
        // Update active button
        filterButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');

        // Show selected carousel, hide others
        const targetCarousel = button.getAttribute('data-target');
        carousels.forEach(carousel => {
            if (carousel.id === targetCarousel) {
                carousel.classList.add('active');
            } else {
                carousel.classList.remove('active');
            }
        });
    });
});

// Initialize WOW.js after all scripts and DOM are fully loaded
(function initWOW() {
    // Check if WOW is available
    if (typeof WOW !== "undefined") {
        try {
            // Initialize WOW.js with proper configuration
            var wow = new WOW({
                boxClass: 'wow',
                animateClass: 'animated',
                offset: 0,
                mobile: true,
                live: true,
                scrollContainer: null
            });
            wow.init();
            console.log('WOW.js initialized successfully');
        } catch (e) {
            console.error('Error initializing WOW.js:', e);
        }
    } else {
        // If WOW is not loaded yet, wait and retry
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initWOW);
        } else {
            setTimeout(initWOW, 200);
        }
    }
})();

// Also initialize on window load as fallback
window.addEventListener('load', function() {
    if (typeof WOW !== "undefined" && !window.wowInitialized) {
        try {
            var wow = new WOW({
                boxClass: 'wow',
                animateClass: 'animated',
                offset: 0,
                mobile: true,
                live: true
            });
            wow.init();
            window.wowInitialized = true;
            console.log('WOW.js initialized on window load');
        } catch (e) {
            console.error('Error initializing WOW.js on load:', e);
        }
    }
});
