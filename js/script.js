// --- 1. Supabase Initialization ---
const SUPABASE_URL = 'https://credvsfvhxuvhkwpsxck.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNyZWR2c2Z2aHh1dmhrd3BzeGNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyNzc0NzcsImV4cCI6MjA4Mzg1MzQ3N30.A7UTOBKjNQi7PAfzRalACiyFDuq_-FufV92V9yMG40o';

let supabaseClient;
let supabaseRetries = 0;
const MAX_RETRIES = 10;

// Safety Check: Wait for Supabase to be available
function initSupabase() {
    if (typeof window.supabase !== 'undefined') {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        console.log("Supabase initialized successfully");
    } else if (supabaseRetries < MAX_RETRIES) {
        supabaseRetries++;
        setTimeout(initSupabase, 500);
    } else {
        console.warn("Supabase failed to load after " + MAX_RETRIES + " attempts. Site will work without database features.");
    }
}
initSupabase();

// Toggle blog post content (collapse/expand)
window.toggleBlogContent = (idx) => {
    const excerpt = document.getElementById(`excerpt-${idx}`);
    const fullContent = document.getElementById(`full-${idx}`);
    const button = event.target;

    if (fullContent.style.display === 'none') {
        excerpt.style.display = 'none';
        fullContent.style.display = 'block';
        button.textContent = 'Show Less';
    } else {
        excerpt.style.display = 'block';
        fullContent.style.display = 'none';
        button.textContent = 'Read More';
    }
};

document.addEventListener('DOMContentLoaded', function () {

    // --- Mobile Menu Toggle ---
    const menuToggle = document.querySelector('.menu-toggle');
    const mainNav = document.getElementById('main-nav');

    if (menuToggle && mainNav) {
        menuToggle.addEventListener('click', function () {
            mainNav.classList.toggle('active');
            menuToggle.classList.toggle('active');
        });

        // Close menu when clicking on a link
        const navLinks = mainNav.querySelectorAll('a');
        navLinks.forEach(link => {
            link.addEventListener('click', function () {
                mainNav.classList.remove('active');
                menuToggle.classList.remove('active');
            });
        });
    }

    // --- A. Global variable to hold our products ---
    window.allProducts = [];

    // --- 2. Floating Cart Logic ---
    window.updateFloatingCart = function () {
        const cart = JSON.parse(localStorage.getItem('rigo_cart')) || [];
        let cartBtn = document.getElementById('floating-cart');
        if (!cartBtn) {
            cartBtn = document.createElement('div');
            cartBtn.id = 'floating-cart';
            cartBtn.innerHTML = `🛒 <span id="cart-count">${cart.length}</span>`;
            cartBtn.onclick = () => {
                const currentPath = window.location.pathname;
                const isInPages = currentPath.includes('/pages/');
                window.location.href = isInPages ? 'cart.html' : 'pages/cart.html';
            };
            document.body.appendChild(cartBtn);
        } else {
            const countEl = document.getElementById('cart-count');
            if (countEl) countEl.textContent = cart.length;
        }
    }
    updateFloatingCart();

    // --- 3. Home Page CMS Loader ---
    async function loadHomeCMS() {
        if (!supabaseClient) return;

        // Load Featured Suits
        const sigGrid = document.querySelector('#featured-products .grid-layout');
        if (sigGrid) {
            const { data: featuredSuits } = await supabaseClient
                .from('products')
                .select('*')
                .eq('is_featured', true)
                .limit(4);

            if (featuredSuits && featuredSuits.length > 0) {
                sigGrid.innerHTML = featuredSuits.map(s => {
                    const hasOffer = s.offer_price && s.offer_price > 0;
                    const discountPercent = hasOffer ? Math.round(((s.original_price - s.offer_price) / s.original_price) * 100) : 0;
                    const displayPrice = hasOffer ? s.offer_price : s.original_price;

                    return `
                    <div class="product-card">
                        <div class="product-image-wrapper">
                            <div class="badge badge-signature">Signature</div>
                            ${hasOffer ? `<div class="badge badge-discount">-${discountPercent}%</div>` : ''}
                            <img src="${s.image_url}" alt="${s.name}">
                        </div>
                        <div class="product-info">
                            <h3>${s.name}</h3>
                            <div class="price-wrapper">
                                <p class="price">KES ${Math.round(displayPrice).toLocaleString()}</p>
                                ${hasOffer ? `<p class="price-original">KES ${Math.round(s.original_price).toLocaleString()}</p>` : ''}
                            </div>
                            <a href="pages/product-detail.html?id=${s.id}" class="quick-view-btn">View Masterpiece</a>
                        </div>
                    </div>
                `;
                }).join('');
            }
        }

        // Load Insights
        const insightsGrid = document.querySelector('.insights-grid');
        if (insightsGrid) {
            const { data: posts } = await supabaseClient.from('insights').select('*').order('created_at', { ascending: false }).limit(3);
            if (posts && posts.length > 0) {
                insightsGrid.innerHTML = posts.map((p, idx) => {
                    const hasImage = p.image_url && p.image_url.trim() !== '';
                    const dateObj = new Date(p.created_at);
                    const formattedDate = dateObj.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase();

                    // --- Remapping Logic ---
                    const coverImg = p.link_url || p.image_url;
                    let author = p.author_name || 'RIGO WEAR';
                    let displayExcerpt = p.excerpt || '';

                    if (displayExcerpt.includes('BY: ')) {
                        const parts = displayExcerpt.split('|');
                        if (parts.length > 1) {
                            author = parts[0].replace('BY: ', '').trim();
                            displayExcerpt = parts.slice(1).join('|').trim();
                        }
                    }

                    return `
                    <div class="insight-card" style="display: flex; flex-direction: column; height: 100%; padding: 0; background: #080808; border: 1px solid #111; overflow: hidden; border-radius: 4px; transition: transform 0.3s ease;" onmouseover="this.style.transform='translateY(-5px)'" onmouseout="this.style.transform='translateY(0)'">
                        ${coverImg ? `
                            <div class="insight-image" style="width: 100%; aspect-ratio: 1 / 1; overflow: hidden; position: relative;">
                                <img src="${coverImg}" alt="${p.title}" style="width: 100%; height: 100%; object-fit: cover;">
                            </div>
                        ` : ''}
                        
                        <div class="insight-content" style="padding: 20px; flex: 1; display: flex; flex-direction: column; gap: 12px;">
                            <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                                <div style="background: rgba(65, 105, 225, 0.1); color: #4169E1; padding: 4px 12px; border-radius: 4px; font-size: 0.65rem; font-weight: bold; display: flex; align-items: center; gap: 6px;">
                                    <i class="far fa-calendar"></i> ${formattedDate}
                                </div>
                                <div style="background: rgba(255, 215, 0, 0.1); color: #FFD700; padding: 4px 12px; border-radius: 4px; font-size: 0.65rem; font-weight: bold; display: flex; align-items: center; gap: 6px;">
                                    <i class="far fa-user"></i> ${author.toUpperCase()}
                                </div>
                            </div>
                            
                            <h3 style="margin: 0; font-size: 1.1rem; line-height: 1.4; color: #fff; text-transform: uppercase;">${p.title}</h3>
                            <p style="margin: 0; color: #888; font-size: 0.85rem; line-height: 1.6; flex: 1;">${displayExcerpt}</p>
                            
                            <a href="pages/blog-detail.html?id=${p.id}" style="margin-top: 10px; color: #FFD700; text-decoration: none; font-size: 0.8rem; font-weight: bold; display: flex; align-items: center; gap: 5px;">READ MORE <i class="fas fa-arrow-right" style="font-size: 0.7rem;"></i></a>
                        </div>
                    </div>
                `;
                }).join('');
            }
        }
    }

    // --- 4. Shop Page Loader ---
    async function loadShopProducts() {
        if (!supabaseClient) return;

        const { data: products } = await supabaseClient
            .from('products')
            .select('*')
            .order('created_at', { ascending: false });

        if (products) {
            window.allProducts = products;
            updateCategoryCounts(products);
            renderProductGrid(products);
        }
    }

    // --- 4b. The Filtering Function ---
    window.filterByCategory = function (category) {
        if (category === 'all') {
            renderProductGrid(window.allProducts);
        } else {
            const filtered = window.allProducts.filter(p => p.category === category);
            renderProductGrid(filtered);
        }
    };

    // --- 4b2. Filter by Tier ---
    window.filterByTier = function (tierClass) {
        // Handle Active State UI
        document.querySelectorAll('#tier-filter-list-desktop a, #tier-filter-list a').forEach(a => a.classList.remove('active'));
        if (tierClass !== 'all') {
            event.currentTarget.classList.add('active');
        }

        if (tierClass === 'all') {
            renderProductGrid(window.allProducts);
        } else {
            const filtered = window.allProducts.filter(p => {
                const tier = getProductTier(p.original_price);
                return tier && tier.class === 'tier-' + tierClass;
            });
            renderProductGrid(filtered);
        }
    };

    // --- 4b3. Search Function ---
    window.handleSearch = function () {
        const searchTerm = document.getElementById('shop-search').value.toLowerCase();

        const filteredResults = allProducts.filter(p => {
            const nameMatch = p.name.toLowerCase().includes(searchTerm);
            const catMatch = p.category.toLowerCase().includes(searchTerm);
            const descMatch = (p.description || "").toLowerCase().includes(searchTerm);

            return nameMatch || catMatch || descMatch;
        });

        renderProductGrid(filteredResults);
    };

    // --- 4b3. Sort Function ---
    window.handleSort = function () {
        const sortValue = document.getElementById('sort-products').value;
        let sortedProducts = [...allProducts];

        if (sortValue === 'newest') {
            sortedProducts.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        } else if (sortValue === 'price-low') {
            sortedProducts.sort((a, b) => a.original_price - b.original_price);
        } else if (sortValue === 'price-high') {
            sortedProducts.sort((a, b) => b.original_price - a.original_price);
        } else if (sortValue === 'name') {
            sortedProducts.sort((a, b) => a.name.localeCompare(b.name));
        }

        renderProductGrid(sortedProducts);
    };

    // --- 4b4. Get Product Tier Helper ---
    function getProductTier(price) {
        if (price >= 18000) return { name: 'Signature Masterpiece', class: 'tier-signature' };
        if (price >= 13000) return { name: 'Executive Line', class: 'tier-executive' };
        if (price >= 8000) return { name: 'Essential Series', class: 'tier-essential' };
        return null;
    }

    // --- 4c. Render Product Grid Helper ---
    function renderProductGrid(productsToDisplay) {
        const productGrid = document.getElementById('product-grid');
        if (!productGrid) return;

        productGrid.innerHTML = productsToDisplay.map(p => {
            const briefDesc = p.description ? p.description.substring(0, 75) + '...' : '';
            const hasOffer = p.offer_price && p.offer_price > 0;
            const discountPercent = hasOffer ? Math.round(((p.original_price - p.offer_price) / p.original_price) * 100) : 0;
            const displayPrice = hasOffer ? p.offer_price : p.original_price;

            const tier = getProductTier(p.original_price);

            return `
                <div class="product-card">
                    <div class="product-image-wrapper">
                        <img src="${p.image_url}" alt="${p.name}">
                        ${hasOffer ? `<div class="badge badge-discount">-${discountPercent}%</div>` : ''}
                        ${tier ? `<div class="tier-badge ${tier.class}">${tier.name}</div>` : ''}
                    </div>
                    <div class="product-info">
                        <small style="color:var(--color-secondary); margin-bottom: 8px;">${p.category}</small>
                        <h3>${p.name}</h3>
                        <p class="brief-desc">${briefDesc}</p>
                        <div class="price-wrapper">
                            <p class="price">KES ${Math.round(displayPrice).toLocaleString()}</p>
                            ${hasOffer ? `<p class="price-original">KES ${Math.round(p.original_price).toLocaleString()}</p>` : ''}
                        </div>
                        <a href="product-detail.html?id=${p.id}" class="quick-view-btn">View Details</a>
                    </div>
                </div>
            `;
        }).join('');
    }

    // --- 4d. Update Category Counts ---
    function updateCategoryCounts(products) {
        const menCount = products.filter(p => p.category === 'Men').length;
        const womenCount = products.filter(p => p.category === 'Women').length;
        const childrenCount = products.filter(p => p.category === 'Children').length;
        const ankarasCount = products.filter(p => p.category === 'Ankaras').length;
        const senatorCount = products.filter(p => p.category === 'Senator').length;

        const menDesktop = document.getElementById('count-men-desktop');
        const womenDesktop = document.getElementById('count-women-desktop');
        const childrenDesktop = document.getElementById('count-children-desktop');
        const ankarasDesktop = document.getElementById('count-ankaras-desktop');
        const senatorDesktop = document.getElementById('count-senator-desktop');

        if (menDesktop) menDesktop.textContent = `(${menCount})`;
        if (womenDesktop) womenDesktop.textContent = `(${womenCount})`;
        if (childrenDesktop) childrenDesktop.textContent = `(${childrenCount})`;
        if (ankarasDesktop) ankarasDesktop.textContent = `(${ankarasCount})`;
        if (senatorDesktop) senatorDesktop.textContent = `(${senatorCount})`;

        const menMobile = document.getElementById('count-men');
        const womenMobile = document.getElementById('count-women');
        const childrenMobile = document.getElementById('count-children');
        const ankarasMobile = document.getElementById('count-ankaras');
        const senatorMobile = document.getElementById('count-senator');

        if (menMobile) menMobile.textContent = `(${menCount})`;
        if (womenMobile) womenMobile.textContent = `(${womenCount})`;
        if (childrenMobile) childrenMobile.textContent = `(${childrenCount})`;
        if (ankarasMobile) ankarasMobile.textContent = `(${ankarasCount})`;
        if (senatorMobile) senatorMobile.textContent = `(${senatorCount})`;
    }

    // --- 4e. Mobile Filter Menu Toggle ---
    const mobileFilterToggle = document.getElementById('mobile-filter-toggle');
    const mobileFilterMenu = document.getElementById('mobile-filter-menu');

    if (mobileFilterToggle) {
        mobileFilterToggle.addEventListener('click', function () {
            mobileFilterMenu.classList.toggle('active');
        });
    }

    const mobileFilterLinks = document.querySelectorAll('#mobile-filter-menu a');
    mobileFilterLinks.forEach(link => {
        link.addEventListener('click', function () {
            mobileFilterMenu.classList.remove('active');
        });
    });

    // --- 5. Product Detail Page Loader ---
    async function loadProductDetail() {
        if (!supabaseClient) return;

        const urlParams = new URLSearchParams(window.location.search);
        const productId = urlParams.get('id');

        if (!productId) {
            document.getElementById('pdp-title').textContent = 'Product Not Found';
            return;
        }

        try {
            const { data, error } = await supabaseClient
                .from('products')
                .select('*')
                .eq('id', productId)
                .single();

            if (error || !data) {
                document.getElementById('pdp-title').textContent = 'Product Not Found';
                return;
            }

            document.getElementById('pdp-title').textContent = data.name || 'Product';

            const hasOffer = data.offer_price && data.offer_price > 0;
            const displayPrice = hasOffer ? data.offer_price : data.original_price;
            const discountPercent = hasOffer ? Math.round(((data.original_price - data.offer_price) / data.original_price) * 100) : 0;

            const tier = getProductTier(data.original_price);

            let priceHTML = hasOffer
                ? `<div style="display: flex; align-items: center; gap: 15px;"><span style="text-decoration: line-through; color: #999; font-size: 1rem;">KES ${Math.round(data.original_price).toLocaleString()}</span><span style="color: #dc3545; font-weight: bold;">-${discountPercent}%</span></div><p style="margin: 8px 0; font-size: 1.5rem; color: #FFD700; font-weight: bold;">KES ${Math.round(displayPrice).toLocaleString()}</p>`
                : `<p style="margin: 8px 0; font-size: 1.5rem; color: #FFD700; font-weight: bold;">KES ${Math.round(displayPrice).toLocaleString()}</p>`;

            if (tier) {
                priceHTML += `<div class="tier-badge ${tier.class}" style="position: static; display: inline-block; margin-top: 10px; font-size: 0.8rem; padding: 8px 16px;">COLLECTION: ${tier.name}</div>`;
            }

            document.getElementById('pdp-price').innerHTML = priceHTML;
            document.getElementById('pdp-desc').textContent = data.description || 'Premium RIGO WEAR garment';

            const mainImg = document.getElementById('pdp-main-image');
            if (data.image_url) {
                mainImg.src = data.image_url;
                mainImg.alt = data.name;
            }

            const addBtn = document.querySelector('.add-to-cart-btn');
            addBtn.onclick = () => {
                const qty = parseInt(document.getElementById('qty').value) || 1;
                const fit = document.getElementById('fit').value;
                const fabric = document.getElementById('fabric').value;

                const cartItem = {
                    id: data.id,
                    name: data.name,
                    price: hasOffer ? data.offer_price : data.original_price,
                    image_url: data.image_url,
                    qty: qty,
                    fit: fit,
                    fabric: fabric
                };

                const cart = JSON.parse(localStorage.getItem('rigo_cart')) || [];
                const existingItem = cart.find(item => item.id === data.id && item.fit === fit && item.fabric === fabric);

                if (existingItem) {
                    existingItem.qty += qty;
                } else {
                    cart.push(cartItem);
                }

                localStorage.setItem('rigo_cart', JSON.stringify(cart));
                updateFloatingCart();
                alert('✓ Added to cart! Click the cart icon to view.');
            };

            document.querySelectorAll('.detail-item h3').forEach(heading => {
                heading.style.cursor = 'pointer';
                heading.onclick = function () {
                    const content = this.nextElementSibling;
                    content.style.display = content.style.display === 'none' ? 'block' : 'none';
                    this.textContent = this.textContent.replace('[+]', '[-]').replace('[-]', '[+]');
                };
            });

            const { data: allProducts } = await supabaseClient
                .from('products')
                .select('*')
                .neq('id', productId)
                .limit(4);

            if (allProducts && allProducts.length > 0) {
                const relatedGrid = document.getElementById('related-grid');
                relatedGrid.innerHTML = allProducts.map(p => {
                    const hasOffer = p.offer_price && p.offer_price > 0;
                    const discountPercent = hasOffer ? Math.round(((p.original_price - p.offer_price) / p.original_price) * 100) : 0;
                    const displayPrice = hasOffer ? p.offer_price : p.original_price;
                    const tier = getProductTier(p.original_price);

                    return `
                    <div class="product-card">
                        <div class="product-image-wrapper">
                            <img src="${p.image_url}" alt="${p.name}" onerror="this.src='https://via.placeholder.com/250x350?text=RIGO'">
                            ${hasOffer ? `<div class="badge badge-discount">-${discountPercent}%</div>` : ''}
                            ${tier ? `<div class="tier-badge ${tier.class}">${tier.name}</div>` : ''}
                        </div>
                        <div class="product-info">
                            <small style="color:var(--color-secondary); margin-bottom: 8px;">${p.category}</small>
                            <h3>${p.name}</h3>
                            <div class="price-wrapper">
                                <p class="price">KES ${Math.round(displayPrice).toLocaleString()}</p>
                                ${hasOffer ? `<p class="price-original">KES ${Math.round(p.original_price).toLocaleString()}</p>` : ''}
                            </div>
                            <a href="product-detail.html?id=${p.id}" class="quick-view-btn">View Details</a>
                        </div>
                    </div>
                `;
                }).join('');
            }
        } catch (error) {
            console.error('Error loading product detail:', error);
            document.getElementById('pdp-title').textContent = 'Error loading product';
        }
    }

    // --- 6. Page Routing ---
    const path = window.location.pathname;
    if (path === '/' || path.includes('index.html')) {
        loadHomeCMS();
    }
    if (path.includes('shop.html')) {
        loadShopProducts();

        const urlParams = new URLSearchParams(window.location.search);
        const categoryFilter = urlParams.get('category');
        if (categoryFilter) {
            setTimeout(() => {
                filterByCategory(categoryFilter);
            }, 500);
        }
    }
    if (path.includes('product-detail.html')) {
        loadProductDetail();
    }
});
