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

document.addEventListener('DOMContentLoaded', function() {
    
    // --- Mobile Menu Toggle ---
    const menuToggle = document.querySelector('.menu-toggle');
    const mainNav = document.getElementById('main-nav');
    
    if (menuToggle && mainNav) {
        menuToggle.addEventListener('click', function() {
            mainNav.classList.toggle('active');
            menuToggle.classList.toggle('active');
        });
        
        // Close menu when clicking on a link
        const navLinks = mainNav.querySelectorAll('a');
        navLinks.forEach(link => {
            link.addEventListener('click', function() {
                mainNav.classList.remove('active');
                menuToggle.classList.remove('active');
            });
        });
    }
    
    // --- A. Global variable to hold our products ---
    window.allProducts = [];

    // --- 2. Floating Cart Logic ---
    function updateFloatingCart() {
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
            document.getElementById('cart-count').textContent = cart.length;
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
                        <div style="position: relative;">
                            <div class="badge" style="position:absolute; background:#FFD700; color:#000; padding:5px 10px; font-weight:bold; z-index: 2;">Signature</div>
                            ${hasOffer ? `<div style="position: absolute; top: 10px; right: 10px; background: #dc3545; color: white; padding: 8px 12px; border-radius: 50%; width: 50px; height: 50px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 0.85rem; text-align: center; z-index: 3;">-${discountPercent}%</div>` : ''}
                            <img src="${s.image_url}" alt="${s.name}">
                        </div>
                        <h3>${s.name}</h3>
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <p class="price">KES ${Math.round(displayPrice).toLocaleString()}</p>
                            ${hasOffer ? `<p style="text-decoration: line-through; color: #999; font-size: 0.9rem;">KES ${Math.round(s.original_price).toLocaleString()}</p>` : ''}
                        </div>
                        <a href="pages/product-detail.html?id=${s.id}" class="quick-view-btn">View Masterpiece</a>
                    </div>
                `;
                }).join('');
            }
        }

        // Load Insights
        const insightsGrid = document.querySelector('.insights-grid');
        if (insightsGrid) {
            const { data: posts } = await supabaseClient.from('insights').select('*').limit(3);
            if (posts && posts.length > 0) {
                insightsGrid.innerHTML = posts.map((p, idx) => `
                    <div class="insight-card">
                        <h3>${p.title}</h3>
                        <p id="excerpt-${idx}" style="display: block;">${p.excerpt}</p>
                        <p id="full-${idx}" style="display: none; margin-top: 10px;">${p.content || p.excerpt}</p>
                        <button onclick="toggleBlogContent(${idx})" style="color:#FFD700; background: none; border: none; cursor: pointer; text-decoration: underline; padding: 0; font-size: 1rem;">Read More</button>
                    </div>
                `).join('');
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
    window.filterByCategory = function(category) {
        if (category === 'all') {
            renderProductGrid(window.allProducts);
        } else {
            const filtered = window.allProducts.filter(p => p.category === category);
            renderProductGrid(filtered);
        }
    };

    // --- 4b2. Search Function ---
    window.handleSearch = function() {
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
    window.handleSort = function() {
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

    // --- 4c. Render Product Grid Helper ---
    function renderProductGrid(productsToDisplay) {
        const productGrid = document.getElementById('product-grid');
        if (!productGrid) return;

        productGrid.innerHTML = productsToDisplay.map(p => {
            const briefDesc = p.description ? p.description.substring(0, 75) + '...' : '';
            const hasOffer = p.offer_price && p.offer_price > 0;
            const discountPercent = hasOffer ? Math.round(((p.original_price - p.offer_price) / p.original_price) * 100) : 0;
            const displayPrice = hasOffer ? p.offer_price : p.original_price;
            
            return `
                <div class="product-card">
                    <div style="position: relative;">
                        <img src="${p.image_url}" alt="${p.name}">
                        ${hasOffer ? `<div style="position: absolute; top: 10px; right: 10px; background: #dc3545; color: white; padding: 8px 12px; border-radius: 50%; width: 50px; height: 50px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 0.85rem; text-align: center;">-${discountPercent}%</div>` : ''}
                    </div>
                    <div class="card-content">
                        <small style="color:var(--color-secondary)">${p.category}</small>
                        <h3>${p.name}</h3>
                        <p class="brief-desc">${briefDesc}</p>
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <p class="price">KES ${Math.round(displayPrice).toLocaleString()}</p>
                            ${hasOffer ? `<p style="text-decoration: line-through; color: #999; font-size: 0.9rem;">KES ${Math.round(p.original_price).toLocaleString()}</p>` : ''}
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
        mobileFilterToggle.addEventListener('click', function() {
            mobileFilterMenu.classList.toggle('active');
        });
    }

    const mobileFilterLinks = document.querySelectorAll('#mobile-filter-menu a');
    mobileFilterLinks.forEach(link => {
        link.addEventListener('click', function() {
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
            
            const priceHTML = hasOffer 
                ? `<div style="display: flex; align-items: center; gap: 15px;"><span style="text-decoration: line-through; color: #999; font-size: 1rem;">KES ${Math.round(data.original_price).toLocaleString()}</span><span style="color: #dc3545; font-weight: bold;">-${discountPercent}%</span></div><p style="margin: 8px 0; font-size: 1.5rem; color: #FFD700; font-weight: bold;">KES ${Math.round(displayPrice).toLocaleString()}</p>`
                : `<p style="margin: 8px 0; font-size: 1.5rem; color: #FFD700; font-weight: bold;">KES ${Math.round(displayPrice).toLocaleString()}</p>`;
            
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
                heading.onclick = function() {
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
                    
                    return `
                    <div class="product-card">
                        <div class="product-image">
                            <img src="${p.image_url}" alt="${p.name}" onerror="this.src='https://via.placeholder.com/250x350?text=RIGO'">
                            ${hasOffer ? `<div style="position: absolute; top: 10px; right: 10px; background: #dc3545; color: white; padding: 8px 12px; border-radius: 50%; width: 50px; height: 50px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 0.85rem; text-align: center;">-${discountPercent}%</div>` : ''}
                        </div>
                        <h3>${p.name}</h3>
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <p class="price">KES ${Math.round(displayPrice).toLocaleString()}</p>
                            ${hasOffer ? `<p style="text-decoration: line-through; color: #999; font-size: 0.9rem;">KES ${Math.round(p.original_price).toLocaleString()}</p>` : ''}
                        </div>
                        <p class="category">${p.category}</p>
                        <a href="product-detail.html?id=${p.id}" class="quick-view-btn">View Details</a>
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
