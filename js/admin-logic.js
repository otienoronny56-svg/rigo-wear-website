const SUPABASE_URL = 'https://credvsfvhxuvhkwpsxck.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNyZWR2c2Z2aHh1dmhrd3BzeGNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyNzc0NzcsImV4cCI6MjA4Mzg1MzQ3N30.A7UTOBKjNQi7PAfzRalACiyFDuq_-FufV92V9yMG40o';

const client = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Security Check
async function checkAuth() {
    const { data: { user } } = await client.auth.getUser();
    if (!user) window.location.href = 'login.html';
    
    // Display admin info
    document.getElementById('admin-username').textContent = user?.email?.split('@')[0]?.toUpperCase() || 'ADMINISTRATOR';
}

// Load and display inventory with professional table
async function refreshInventory() {
    const { data: products } = await client.from('products').select('*').order('created_at', {ascending: false});
    
    const tableBody = document.getElementById('admin-inventory-list');
    
    if (!products || products.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: #999; padding: 40px;">No products in inventory</td></tr>';
        return;
    }
    
    tableBody.innerHTML = products.map(p => {
        const isOutOfStock = p.status === 'Sold Out';
        const statusClass = isOutOfStock ? 'status-out-of-stock' : 'status-in-stock';
        const statusText = isOutOfStock ? 'Out of Stock' : 'In Stock';
        const isFeatured = p.is_featured;
        
        // Calculate discount percentage
        const originalPrice = parseFloat(p.original_price) || 0;
        const offerPrice = parseFloat(p.offer_price) || 0;
        const discountPercent = offerPrice > 0 ? Math.round(((originalPrice - offerPrice) / originalPrice) * 100) : 0;
        const hasOffer = offerPrice > 0 && discountPercent > 0;
        
        return `
            <tr data-product-id="${p.id}" style="border-bottom: 1px solid #222;">
                <td style="padding: 12px; color: #fff; font-weight: 600;">${p.name || 'Unknown'}</td>
                <td style="text-align: center; padding: 12px;">
                    <img src="${p.image_url}" alt="${p.name}" class="product-thumb" onerror="this.src='https://via.placeholder.com/50?text=RIGO'">
                </td>
                <td style="text-align: center; padding: 12px;">
                    <input type="number" class="price-edit-input" value="${Math.round(originalPrice)}" data-product-id="${p.id}" data-field="original_price" />
                </td>
                <td style="text-align: center; padding: 12px;">
                    <input type="number" class="price-edit-input" value="${offerPrice > 0 ? Math.round(offerPrice) : ''}" data-product-id="${p.id}" data-field="offer_price" />
                </td>
                <td style="text-align: center; padding: 12px; font-weight: bold;">
                    ${hasOffer ? `<span style="color: #FF6B6B;">-${discountPercent}%</span>` : '<span style="color: #666;">—</span>'}
                </td>
                <td style="text-align: center; padding: 12px;">
                    <span class="status-badge ${statusClass}" onclick="toggleStockStatus('${p.id}', '${isOutOfStock ? 'In Stock' : 'Sold Out'}')" style="cursor: pointer;">
                        ${statusText}
                    </span>
                </td>
                <td style="text-align: center; padding: 12px;">
                    <div style="display: flex; gap: 6px; justify-content: center; flex-wrap: wrap;">
                        <button onclick="saveProductPrice('${p.id}')" class="action-btn" title="Save price">💾</button>
                        <button onclick="toggleFeatured('${p.id}', ${isFeatured})" class="action-btn" style="background: ${isFeatured ? '#FFD700' : 'none'}; color: ${isFeatured ? '#000' : '#FFD700'};" title="Featured">⭐</button>
                        <button onclick="deleteProduct('${p.id}')" class="action-btn action-btn-danger" title="Delete">🗑️</button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// Toggle featured status (for signature collections)
window.toggleFeatured = async (productId, isFeatured) => {
    try {
        const newStatus = !isFeatured;
        await client.from('products').update({ is_featured: newStatus }).eq('id', productId);
        await refreshInventory();
        
        if (newStatus) {
            showNotification('✅ Added to Signature Collections', 'success');
        } else {
            showNotification('⭐ Removed from Signature Collections', 'info');
        }
    } catch (error) {
        console.error('Error toggling featured status:', error);
        showNotification('❌ Failed to update status', 'error');
    }
};

// Toggle stock status (In Stock / Out of Stock)
window.toggleStockStatus = async (productId, newStatus) => {
    try {
        await client.from('products').update({ status: newStatus }).eq('id', productId);
        await refreshInventory();
        showNotification(`Status changed to "${newStatus}"`);
    } catch (error) {
        console.error('Error updating status:', error);
        showNotification('Failed to update status', 'error');
    }
};

// Save price change to database and update website
window.saveProductPrice = async (productId) => {
    const originalPriceInput = document.querySelector(`input[data-product-id="${productId}"][data-field="original_price"]`);
    const offerPriceInput = document.querySelector(`input[data-product-id="${productId}"][data-field="offer_price"]`);
    
    const originalPrice = parseFloat(originalPriceInput.value);
    const offerPrice = parseFloat(offerPriceInput.value) || null;
    
    if (isNaN(originalPrice) || originalPrice <= 0) {
        showNotification('Please enter a valid original price', 'error');
        return;
    }
    
    if (offerPrice !== null && (isNaN(offerPrice) || offerPrice <= 0 || offerPrice >= originalPrice)) {
        showNotification('Offer price must be greater than 0 and less than original price', 'error');
        return;
    }
    
    try {
        await client.from('products').update({ 
            original_price: originalPrice,
            offer_price: offerPrice
        }).eq('id', productId);
        showNotification('✅ Prices updated successfully! Website will refresh in 2 seconds...');
        
        // Refresh the shop page cache after 2 seconds
        setTimeout(() => {
            window.allProducts = null;
            refreshInventory();
        }, 2000);
        
    } catch (error) {
        console.error('Error updating prices:', error);
        showNotification('Failed to update prices', 'error');
    }
};

// Delete product
window.deleteProduct = async (productId) => {
    if (confirm('⚠️ Are you sure you want to DELETE this product? This action cannot be undone!')) {
        try {
            await client.from('products').delete().eq('id', productId);
            showNotification('✅ Product deleted successfully');
            await refreshInventory();
        } catch (error) {
            console.error('Error deleting product:', error);
            showNotification('Failed to delete product', 'error');
        }
    }
};

// Notification system
function showNotification(message, type = 'success') {
    const notif = document.createElement('div');
    notif.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'error' ? '#dc3545' : '#28a745'};
        color: white;
        padding: 15px 25px;
        border-radius: 5px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 10000;
        font-weight: bold;
        animation: slideIn 0.3s ease-out;
    `;
    notif.textContent = message;
    document.body.appendChild(notif);
    
    setTimeout(() => notif.remove(), 3000);
}

// Refresh all admin lists
async function refreshDashboard() {
    await refreshInventory();
    await loadBlogs();
    await loadCollections();
    
    // Load Orders with Phone Numbers
    const { data: orders } = await client.from('orders').select('*').order('created_at', {ascending: false});
    document.getElementById('admin-orders-list').innerHTML = orders?.map(o => `
        <div class="admin-card" style="border-left: 4px solid #FFD700;">
            <p><strong>Client:</strong> ${o.customer_name}</p>
            <p><strong>Phone:</strong> <a href="tel:${o.phone}" style="color: #4169E1;">${o.phone}</a></p>
            <p><strong>Total:</strong> KES ${Math.round(o.total_amount).toLocaleString()}</p>
        </div>
    `).join('') || '<p>No orders yet.</p>';
}

// Load and display blogs
async function loadBlogs() {
    const { data: blogs } = await client.from('insights').select('*').order('created_at', {ascending: false});
    const blogsList = document.getElementById('admin-blogs-list');
    
    if (!blogs || blogs.length === 0) {
        blogsList.innerHTML = '<p style="color: #999;">No blog posts yet.</p>';
        return;
    }
    
    blogsList.innerHTML = blogs.map(b => `
        <div class="admin-card" style="border-left: 4px solid #FFD700; margin-bottom: 10px;">
            <div style="display: flex; justify-content: space-between; align-items: start;">
                <div style="flex: 1;">
                    <h4 style="margin: 0 0 5px 0; color: #FFD700;">${b.title}</h4>
                    <p style="margin: 0; color: #ccc; font-size: 0.9rem;">${b.excerpt}</p>
                </div>
                <button onclick="deleteBlog('${b.id}')" class="action-btn action-btn-danger" style="margin-left: 10px;" title="Delete this blog">🗑️</button>
            </div>
        </div>
    `).join('');
}

// Load and display signature collections
async function loadCollections() {
    try {
        const { data: collections, error } = await client.from('signature_collections').select('*');
        
        if (error) {
            console.error('❌ Collections Error:', error);
            const collectionsList = document.getElementById('admin-collections-list');
            collectionsList.innerHTML = '<p style="color: #FF6B6B;">⚠️ Collections table not found. Run SQL to create it.</p>';
            return;
        }
        
        const collectionsList = document.getElementById('admin-collections-list');
        
        if (!collections || collections.length === 0) {
            collectionsList.innerHTML = '<p style="color: #999;">No collections yet.</p>';
            return;
        }
        
        collectionsList.innerHTML = collections.map(c => `
            <div class="admin-card" style="border-left: 4px solid #28a745; margin-bottom: 10px; display: flex; gap: 15px; align-items: center;">
                <img src="${c.image_url}" alt="${c.name}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 3px;">
                <div style="flex: 1;">
                    <h4 style="margin: 0; color: #FFD700;">${c.name}</h4>
                </div>
                <button onclick="deleteCollection('${c.id}')" class="action-btn action-btn-danger" title="Delete this collection">🗑️</button>
            </div>
        `).join('');
    } catch (err) {
        console.error('❌ Collection Load Error:', err);
        document.getElementById('admin-collections-list').innerHTML = '<p style="color: #FF6B6B;">Error loading collections</p>';
    }
}

// Delete blog
window.deleteBlog = async (blogId) => {
    if (confirm('⚠️ Are you sure you want to DELETE this blog post?')) {
        try {
            await client.from('insights').delete().eq('id', blogId);
            showNotification('✅ Blog post deleted successfully');
            await loadBlogs();
        } catch (error) {
            console.error('Error deleting blog:', error);
            showNotification('Failed to delete blog post', 'error');
        }
    }
};

// Delete collection
window.deleteCollection = async (collectionId) => {
    if (confirm('⚠️ Are you sure you want to DELETE this collection?')) {
        try {
            await client.from('signature_collections').delete().eq('id', collectionId);
            showNotification('✅ Collection deleted successfully');
            await loadCollections();
        } catch (error) {
            console.error('Error deleting collection:', error);
            showNotification('Failed to delete collection', 'error');
        }
    }
};

document.addEventListener('DOMContentLoaded', async () => {
    await checkAuth();
    refreshDashboard();

    // Search functionality for inventory
    document.getElementById('inventory-search').addEventListener('keyup', async (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const rows = document.querySelectorAll('#admin-inventory-list tr');
        
        rows.forEach(row => {
            const productName = row.querySelector('td:nth-child(1)').textContent.toLowerCase();
            row.style.display = productName.includes(searchTerm) ? '' : 'none';
        });
    });

    // HANDLER: Add New Suit
    document.getElementById('product-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const file = document.getElementById('p-image-file').files[0];
        const path = `suits/${Date.now()}-${file.name}`;
        await client.storage.from('product-images').upload(path, file);
        const { data: url } = client.storage.from('product-images').getPublicUrl(path);

        const isFeatured = document.getElementById('p-featured').checked;

        await client.from('products').insert([{
            name: document.getElementById('p-name').value,
            original_price: parseFloat(document.getElementById('p-price').value),
            offer_price: document.getElementById('p-offer').value ? parseFloat(document.getElementById('p-offer').value) : null,
            category: document.getElementById('p-cat').value,
            status: document.getElementById('p-status').value,
            description: document.getElementById('p-desc').value,
            features: document.getElementById('p-features').value,
            image_url: url.publicUrl,
            is_featured: isFeatured
        }]);
        showNotification("✅ Suit Added Successfully!");
        e.target.reset();
        refreshDashboard();
    });

    // HANDLER: Home Signature Collections
    document.getElementById('sig-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
            const file = document.getElementById('sig-image').files[0];
            const path = `home/${Date.now()}-${file.name}`;
            await client.storage.from('product-images').upload(path, file);
            const { data: url } = client.storage.from('product-images').getPublicUrl(path);

            const { error } = await client.from('signature_collections').insert([{
                name: document.getElementById('sig-name').value,
                image_url: url.publicUrl
            }]);
            
            if (error) {
                console.error('❌ Collections Insert Error:', error);
                showNotification('❌ Collections table issue. Contact developer.', 'error');
                return;
            }
            
            showNotification("✅ Signature Collection Updated!");
            e.target.reset();
        } catch (err) {
            console.error('❌ Signature Collection Error:', err);
            showNotification('❌ Error adding collection', 'error');
        }
    });

    // HANDLER: Latest Insights
    document.getElementById('insight-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        await client.from('insights').insert([{
            title: document.getElementById('ins-title').value,
            excerpt: document.getElementById('ins-excerpt').value
        }]);
        showNotification("✅ Insight Published!");
        e.target.reset();
    });

    document.getElementById('admin-logout').onclick = async () => {
        await client.auth.signOut();
        window.location.href = 'login.html';
    };
});

// Navigation handler
window.showView = (viewName) => {
    document.querySelectorAll('.view-section').forEach(v => v.classList.remove('active'));
    document.getElementById(`view-${viewName}`).classList.add('active');
    
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    event.target.classList.add('active');
    
    // Refresh data when switching views
    if (viewName === 'inventory') refreshInventory();
};