// Search and Filter Functionality for Bookify

(function() {
    'use strict';

    // Sample booking data - In production, this would come from a database/API
    const bookingData = [
        { name: 'Raj Hotel', location: 'Mumbai', price: 345, type: 'hotel', rating: 4 },
        { name: 'Grand Palace Hotel', location: 'Delhi', price: 1200, type: 'hotel', rating: 5 },
        { name: 'Sunset Restaurant', location: 'Kashmir', price: 800, type: 'restaurant', rating: 4 },
        { name: 'Cozy Guest House', location: 'Jaipur', price: 500, type: 'guesthouse', rating: 3 },
        { name: 'Beach View Hotel', location: 'Kerala', price: 2000, type: 'hotel', rating: 5 },
        { name: 'Spice Garden Restaurant', location: 'Mumbai', price: 600, type: 'restaurant', rating: 4 },
        { name: 'Heritage Guest House', location: 'Delhi', price: 450, type: 'guesthouse', rating: 4 },
        { name: 'Mountain View Hotel', location: 'Kashmir', price: 1500, type: 'hotel', rating: 5 },
    ];

    // Initialize search and filter
    function initSearchFilter() {
        const searchInput = document.getElementById('searchInput');
        const searchBtn = document.getElementById('searchBtn');
        const filterLocation = document.getElementById('filterLocation');
        const filterPrice = document.getElementById('filterPrice');
        const filterRating = document.getElementById('filterRating');
        const filterType = document.getElementById('filterType');
        const clearFiltersBtn = document.getElementById('clearFilters');
        const resultsCount = document.getElementById('resultsCount');

        if (!searchInput) return; // Exit if search elements don't exist

        // Get all filterable elements
        const filterableElements = document.querySelectorAll('[data-booking-name], .booking-item, #cardBooking, .col-lg-6');

        // Filter function
        function applyFilters() {
            const searchTerm = searchInput.value.toLowerCase().trim();
            const locationFilter = filterLocation ? filterLocation.value : '';
            const priceFilter = filterPrice ? filterPrice.value : '';
            const ratingFilter = filterRating ? filterRating.value : '';
            const typeFilter = filterType ? filterType.value : '';

            let visibleCount = 0;
            let totalCount = 0;

            filterableElements.forEach(function(element) {
                totalCount++;
                let shouldShow = true;

                // Get element data
                const elementName = (element.getAttribute('data-booking-name') || 
                                   element.querySelector('.card-title')?.textContent || 
                                   element.querySelector('h5 span')?.textContent || '').toLowerCase();
                const elementLocation = (element.getAttribute('data-location') || 
                                        element.querySelector('[data-location]')?.textContent || 
                                        element.textContent.match(/Mumbai|Delhi|Kashmir|Jaipur|Kerala/i)?.[0] || '').toLowerCase();
                const elementPrice = parseInt(element.getAttribute('data-price') || 
                                             element.querySelector('.text-primary')?.textContent.match(/\d+/)?.[0] || '0');
                const elementType = (element.getAttribute('data-type') || '').toLowerCase();
                const elementRating = parseInt(element.getAttribute('data-rating') || '0');

                // Apply search filter
                if (searchTerm && !elementName.includes(searchTerm) && !elementLocation.includes(searchTerm)) {
                    shouldShow = false;
                }

                // Apply location filter
                if (locationFilter && elementLocation !== locationFilter.toLowerCase()) {
                    shouldShow = false;
                }

                // Apply price filter
                if (priceFilter) {
                    if (priceFilter === '2000+') {
                        if (elementPrice < 2000) shouldShow = false;
                    } else {
                        const [min, max] = priceFilter.split('-').map(Number);
                        if (elementPrice < min || elementPrice > max) shouldShow = false;
                    }
                }

                // Apply rating filter
                if (ratingFilter && elementRating < parseInt(ratingFilter)) {
                    shouldShow = false;
                }

                // Apply type filter
                if (typeFilter) {
                    const elementTypeText = element.textContent.toLowerCase();
                    if (typeFilter === 'hotel' && !elementTypeText.includes('hotel')) shouldShow = false;
                    if (typeFilter === 'restaurant' && !elementTypeText.includes('restaurant')) shouldShow = false;
                    if (typeFilter === 'guesthouse' && !elementTypeText.includes('guest')) shouldShow = false;
                }

                // Show/hide element
                if (shouldShow) {
                    element.style.display = '';
                    element.classList.remove('d-none');
                    visibleCount++;
                } else {
                    element.style.display = 'none';
                    element.classList.add('d-none');
                }
            });

            // Update results count
            if (resultsCount) {
                resultsCount.textContent = `Showing ${visibleCount} of ${totalCount} results`;
            }
        }

        // Event listeners
        if (searchInput) {
            searchInput.addEventListener('input', applyFilters);
            searchInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    applyFilters();
                }
            });
        }

        if (searchBtn) {
            searchBtn.addEventListener('click', applyFilters);
        }

        if (filterLocation) filterLocation.addEventListener('change', applyFilters);
        if (filterPrice) filterPrice.addEventListener('change', applyFilters);
        if (filterRating) filterRating.addEventListener('change', applyFilters);
        if (filterType) filterType.addEventListener('change', applyFilters);

        if (clearFiltersBtn) {
            clearFiltersBtn.addEventListener('click', function() {
                if (searchInput) searchInput.value = '';
                if (filterLocation) filterLocation.value = '';
                if (filterPrice) filterPrice.value = '';
                if (filterRating) filterRating.value = '';
                if (filterType) filterType.value = '';
                applyFilters();
            });
        }

        // Initial filter application
        applyFilters();
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initSearchFilter);
    } else {
        initSearchFilter();
    }
})();

