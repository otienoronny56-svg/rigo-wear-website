const SUPABASE_URL = 'https://credvsfvhxuvhkwpsxck.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNyZWR2c2Z2aHh1dmhrd3BzeGNrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODI3NzQ3NywiZXhwIjoyMDgzODUzNDc3fQ.fUyDf5KDC183qHvxy-mgqFenIFlOb7k8JEHr6xpOGyw';

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
                <td style="text-align: center; padding: 12px; color: #ccc;">${p.category || '—'}</td>
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
                        <button onclick="saveProductPrice('${p.id}')" class="action-btn" title="Quick Save Price">💾</button>
                        <button onclick="openEditModal('${p.id}')" class="action-btn" title="Edit Full Details">✏️</button>
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
    await refreshOrders();
}

async function refreshOrders() {
    const { data: orders } = await client.from('orders').select('*').order('created_at', {ascending: false});
    document.getElementById('admin-orders-list').innerHTML = orders?.map(o => {
        const date = new Date(o.created_at).toLocaleDateString();
        const itemsList = Array.isArray(o.items) ? o.items.map(item => `
            <div style="font-size: 0.8rem; color: #aaa; margin-top: 5px; border-top: 1px solid #1a1a1a; padding-top: 3px;">
                • ${item.name} (${item.qty}x) - ${item.fit || 'Bespoke'}
            </div>
        `).join('') : '<p>No items listed</p>';

        return `
            <div class="admin-card" style="border-left: 4px solid #FFD700; background: #080808; padding: 20px; border-radius: 8px; margin-bottom: 15px;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px;">
                    <div>
                        <p style="margin: 0; font-size: 0.75rem; color: #666;">${date}</p>
                        <h4 style="margin: 5px 0; color: #fff; font-size: 1.1rem;">${o.customer_name}</h4>
                    </div>
                    <span style="background: rgba(255, 215, 0, 0.1); color: #FFD700; padding: 4px 10px; border-radius: 100px; font-size: 0.7rem; font-weight: bold;">
                        ${o.status || 'NEW'}
                    </span>
                </div>
                
                <p style="margin: 0 0 10px 0; font-size: 0.9rem;">
                    <i class="fas fa-phone" style="width: 20px; color: #4169E1;"></i> 
                    <a href="tel:${o.phone}" style="color: #4169E1; text-decoration: none;">${o.phone}</a>
                </p>
                
                <div style="background: #000; padding: 10px; border-radius: 4px; margin-bottom: 15px;">
                    <p style="margin: 0 0 5px 0; font-size: 0.8rem; font-weight: bold; color: #999; text-transform: uppercase;">Items Ordered:</p>
                    ${itemsList}
                </div>

                <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #222; pt: 10px; margin-top: 10px; padding-top: 10px;">
                    <span style="font-size: 0.85rem; color: #666;">Total Amount:</span>
                    <span style="font-size: 1.1rem; font-weight: bold; color: #FFD700;">KES ${Math.round(o.total_amount).toLocaleString()}</span>
                </div>
            </div>
        `;
    }).join('') || '<p>No orders yet.</p>';
}

// Load and display blogs
async function loadBlogs() {
    const { data: blogs } = await client.from('insights').select('*').order('created_at', {ascending: false});
    const blogsList = document.getElementById('admin-blogs-list');
    
    if (!blogs || blogs.length === 0) {
        blogsList.innerHTML = '<p style="color: #666; text-align: center; grid-column: 1/-1; padding: 40px;">No blog posts yet.</p>';
        return;
    }
    
    document.getElementById('admin-blogs-list').innerHTML = blogs?.map(b => {
        const date = new Date(b.created_at).toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric'});
        
        // --- Remapping Logic ---
        const coverImg = b.link_url || b.image_url;
        let author = b.author_name || 'RIGO Admin';
        let displayExcerpt = b.excerpt || '';
        
        if (displayExcerpt.includes('BY: ')) {
            const parts = displayExcerpt.split('|');
            if (parts.length > 1) {
                author = parts[0].replace('BY: ', '').trim();
                displayExcerpt = parts.slice(1).join('|').trim();
            }
        }
        
        return `
        <div class="admin-card blog-admin-card" style="padding: 0; background: #000; border: 1px solid #1a1a1a; display: flex; flex-direction: column;">
            ${coverImg ? `
                <div style="width: 100%; height: 180px; overflow: hidden; border-bottom: 2px solid #FFD700; position: relative;">
                    <img src="${coverImg}" style="width: 100%; height: 100%; object-fit: cover;">
                    <div style="position: absolute; bottom: 10px; right: 10px; background: #FFD700; color: #000; padding: 4px 10px; font-size: 0.65rem; font-weight: bold; border-radius: 4px;">SQUARE EDITION</div>
                </div>
            ` : `
                <div style="width: 100%; height: 150px; background: #111; display:flex; align-items:center; justify-content:center; border-bottom: 1px solid #222;">
                    <span style="color: #333; font-size: 0.8rem;">No Cover Image</span>
                </div>
            `}
            
            <div style="padding: 15px; flex: 1; display: flex; flex-direction: column;">
                <p style="color: #FFD700; font-size: 0.75rem; margin-bottom: 8px; letter-spacing: 1px;">${date} | By ${author}</p>
                <h4 style="margin: 0 0 10px 0; color: #fff; font-size: 1.1rem; line-height: 1.4;">${b.title}</h4>
                <p style="margin: 0; color: #888; font-size: 0.85rem; line-height: 1.5; flex: 1;">${displayExcerpt.substring(0, 100)}...</p>
                
                <div style="margin-top: 15px; display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #111; padding-top: 10px;">
                    <span style="color: #444; font-size: 0.7rem;">ID: ${b.id.substring(0, 8)}</span>
                    <button onclick="deleteBlog('${b.id}')" class="action-btn action-btn-danger" style="padding: 6px 10px;" title="Delete this blog">🗑️ Delete</button>
                </div>
            </div>
        </div>
        `;
    }).join('');
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



// Navigation handler
window.showView = (viewName) => {
    // Hide all views
    document.querySelectorAll('.view-section').forEach(v => v.classList.remove('active'));
    // Show selected view
    document.getElementById(`view-${viewName}`).classList.add('active');
    
    // Manage active state of buttons
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    if (event && event.target && event.target.classList) {
        event.target.classList.add('active');
    }
    
    // Mobile sidebar auto-close
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('.sidebar-overlay');
    if (sidebar && sidebar.classList.contains('open')) {
        sidebar.classList.remove('open');
        if (overlay) overlay.classList.remove('active');
    }

    // Refresh content if needed
    if (viewName === 'inventory') refreshInventory();
    if (viewName === 'media-library') loadMediaLibrary();
};

window.toggleSidebar = () => {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('.sidebar-overlay');
    if (sidebar) sidebar.classList.toggle('open');
    if (overlay) overlay.classList.toggle('active');
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



    // HANDLER: Latest Insights (Nuclear Redesign)
    document.getElementById('insight-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
            const btn = e.target.querySelector('button[type="submit"]');
            const originalText = btn.textContent;
            btn.textContent = "⌛ PUBLISHING...";
            btn.disabled = true;

            const title = document.getElementById('ins-title').value;
            const author_name = document.getElementById('ins-author').value;
            const excerpt = document.getElementById('ins-excerpt').value;
            const content = document.getElementById('ins-content').value;
            let imageUrl = document.getElementById('ins-image-url').value;
            const file = document.getElementById('ins-image-file').files[0];

            // Handle direct file upload if provided
            if (file) {
                const path = `blogs/${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
                const { error: uploadError } = await client.storage.from('product-images').upload(path, file);
                if (uploadError) throw uploadError;
                
                const { data: urlData } = client.storage.from('product-images').getPublicUrl(path);
                imageUrl = urlData.publicUrl;
            }

            const { error } = await client.from('insights').insert([{
                title,
                author_name,
                excerpt,
                content,
                image_url: imageUrl
            }]);

            if (error) throw error;

            showNotification("✨ MASTERPIECE BLOG PUBLISHED!");
            e.target.reset();
            
            // Reset preview
            document.getElementById('blog-preview-img').style.display = 'none';
            document.getElementById('blog-preview-placeholder').style.display = 'block';
            document.getElementById('ins-image-url').value = '';

            await loadBlogs();
            
            btn.textContent = originalText;
            btn.disabled = false;
        } catch (err) {
            console.error('❌ Insight Error:', err);
            showNotification('❌ Failed to publish. Table might need columns: content, image_url', 'error');
            const btn = e.target.querySelector('button[type="submit"]');
            btn.textContent = "📽️ PUBLISH TO WEBSITE";
            btn.disabled = false;
        }
    });

    document.getElementById('admin-logout').onclick = async () => {
        await client.auth.signOut();
        window.location.href = 'login.html';
    };
});

// =============================================
// MEDIA PICKER — Restored for Blogs
// =============================================
window.openMediaPicker = async () => {
    const modal = document.getElementById('media-picker-modal');
    const grid = document.getElementById('picker-grid');
    const loading = document.getElementById('picker-loading');
    
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
    grid.innerHTML = '';
    loading.style.display = 'block';

    try {
        const { data: files, error } = await client.storage
            .from('product-images')
            .list('product-suits', { limit: 100, offset: 0 });

        if (error) throw error;
        loading.style.display = 'none';

        grid.innerHTML = files
            .filter(f => f.name !== '.emptyFolderPlaceholder')
            .map(f => {
                const { data } = client.storage.from('product-images').getPublicUrl(`product-suits/${f.name}`);
                return `
                    <div onclick="selectImageForBlog('${data.publicUrl}')" style="cursor:pointer;border:1px solid #333;border-radius:5px;overflow:hidden;background:#0d0d0d;transition:0.2s;" onmouseover="this.style.borderColor='#FFD700'">
                        <img src="${data.publicUrl}" style="width:100%;height:100px;object-fit:cover;">
                    </div>
                `;
            }).join('');
    } catch (err) {
        loading.textContent = 'Error: ' + err.message;
    }
};

window.closeMediaPicker = () => {
    document.getElementById('media-picker-modal').style.display = 'none';
    document.body.style.overflow = '';
};

window.selectImageForBlog = (url) => {
    document.getElementById('ins-image-url').value = url;
    document.getElementById('blog-preview-img').src = url;
    document.getElementById('blog-preview-img').style.display = 'block';
    document.getElementById('blog-preview-placeholder').style.display = 'none';
    
    // Clear file input if a library image is picked
    document.getElementById('ins-image-file').value = '';
    
    closeMediaPicker();
    showNotification('Cover image selected from library');
};



// =============================================
// MEDIA LIBRARY — Upload handlers
// =============================================
window.handleMediaDrop = async (event) => {
    event.preventDefault();
    document.getElementById('upload-zone').style.borderColor = '#FFD700';
    const files = event.dataTransfer.files;
    if (files.length > 0) await handleMediaUpload(files);
};

window.handleMediaUpload = async (files) => {
    if (!files || files.length === 0) return;

    const progressBox = document.getElementById('upload-progress-box');
    const progressList = document.getElementById('upload-progress-list');
    progressBox.style.display = 'block';
    progressList.innerHTML = '';

    let successCount = 0;

    for (const file of files) {
        const cleanName = file.name.replace(/\s+/g, '_');
        const storagePath = `product-suits/${Date.now()}_${cleanName}`;

        const itemEl = document.createElement('div');
        itemEl.style.cssText = 'padding:6px 0; border-bottom:1px solid #222; color:#ccc; font-size:0.85rem;';
        itemEl.textContent = `⏳ ${file.name}`;
        progressList.appendChild(itemEl);

        const { error } = await client.storage
            .from('product-images')
            .upload(storagePath, file, { upsert: true });

        if (error) {
            itemEl.textContent = `❌ ${file.name} — ${error.message}`;
            itemEl.style.color = '#dc3545';
        } else {
            itemEl.textContent = `✅ ${file.name}`;
            itemEl.style.color = '#28a745';
            successCount++;
        }
    }

    // Reset file input
    document.getElementById('media-upload-input').value = '';

    // Show done message then reload grid
    const doneEl = document.createElement('p');
    doneEl.style.cssText = 'color:#FFD700;font-weight:bold;margin:10px 0 0;';
    doneEl.textContent = `Done! ${successCount}/${files.length} uploaded. Refreshing gallery...`;
    progressList.appendChild(doneEl);

    setTimeout(async () => {
        progressBox.style.display = 'none';
        await loadMediaLibrary();
    }, 2000);
};

// =============================================
// MEDIA LIBRARY — load images from Supabase Storage
// =============================================
let selectedImageUrl = '';

async function loadMediaLibrary() {
    const grid = document.getElementById('media-grid');
    const loading = document.getElementById('media-loading');
    grid.innerHTML = '';
    loading.style.display = 'block';

    try {
        const { data: files, error } = await client.storage
            .from('product-images')
            .list('product-suits', { limit: 200, offset: 0 });

        if (error) throw error;

        loading.style.display = 'none';

        if (!files || files.length === 0) {
            grid.innerHTML = '<p style="color:#999;">No images found in product-suits folder.</p>';
            return;
        }

        grid.innerHTML = files
            .filter(f => f.name !== '.emptyFolderPlaceholder')
            .map(f => {
                const { data } = client.storage.from('product-images').getPublicUrl(`product-suits/${f.name}`);
                const url = data.publicUrl;
                return `
                    <div onclick="openMediaModal('${url}', '${f.name}')" style="cursor:pointer;border:2px solid #333;border-radius:6px;overflow:hidden;transition:0.2s;background:#0d0d0d;" onmouseover="this.style.borderColor='#FFD700'" onmouseout="this.style.borderColor='#333'">
                        <img src="${url}" alt="${f.name}" style="width:100%;height:140px;object-fit:cover;display:block;">
                        <p style="font-size:0.7rem;color:#999;padding:6px 8px;margin:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${f.name}</p>
                    </div>
                `;
            }).join('');
    } catch (err) {
        loading.textContent = '❌ Failed to load images: ' + err.message;
        console.error(err);
    }
}

window.openMediaModal = (url, filename) => {
    selectedImageUrl = url;
    document.getElementById('modal-preview').src = url;
    // Pre-fill name from filename (strip extension and underscores)
    const guessedName = filename.replace(/\.[^.]+$/, '').replace(/_/g, ' ');
    document.getElementById('ml-name').value = '';
    document.getElementById('ml-price').value = '';
    document.getElementById('ml-offer').value = '';
    document.getElementById('ml-desc').value = '';
    document.getElementById('ml-featured').checked = false;
    document.getElementById('ml-saving').style.display = 'none';
    document.getElementById('media-modal').style.display = 'block';
    document.body.style.overflow = 'hidden';
};

window.closeMediaModal = () => {
    document.getElementById('media-modal').style.display = 'none';
    document.body.style.overflow = '';
};

window.saveProductFromMedia = async () => {
    const name = document.getElementById('ml-name').value.trim();
    const price = parseFloat(document.getElementById('ml-price').value);
    const offer = document.getElementById('ml-offer').value ? parseFloat(document.getElementById('ml-offer').value) : null;
    const category = document.getElementById('ml-cat').value;
    const desc = document.getElementById('ml-desc').value.trim();
    const featured = document.getElementById('ml-featured').checked;

    if (!name || isNaN(price) || price <= 0) {
        showNotification('Please enter a product name and valid price.', 'error');
        return;
    }

    document.getElementById('ml-saving').style.display = 'block';

    const { error } = await client.from('products').insert([{
        name,
        original_price: price,
        offer_price: offer,
        category,
        description: desc,
        image_url: selectedImageUrl,
        is_featured: featured,
        status: 'In Stock'
    }]);

    document.getElementById('ml-saving').style.display = 'none';

    if (error) {
        showNotification('❌ Failed to save product: ' + error.message, 'error');
    } else {
        showNotification('✅ Product saved! Now visible on the shop.');
        closeMediaModal();
        refreshInventory();
    }
};

// =============================================
// EDIT PRODUCT MODAL HANDLERS
// =============================================
window.openEditModal = async (productId) => {
    try {
        const { data: p, error } = await client.from('products').select('*').eq('id', productId).single();
        if (error) throw error;

        document.getElementById('edit-id').value = p.id;
        document.getElementById('edit-name').value = p.name || '';
        document.getElementById('edit-price').value = Math.round(p.original_price) || '';
        document.getElementById('edit-offer').value = p.offer_price ? Math.round(p.offer_price) : '';
        document.getElementById('edit-cat').value = p.category || 'Men';
        document.getElementById('edit-desc').value = p.description || '';
        document.getElementById('edit-preview').src = p.image_url || 'https://via.placeholder.com/300?text=No+Image';
        
        document.getElementById('edit-saving').style.display = 'none';
        document.getElementById('edit-modal').style.display = 'block';
        document.body.style.overflow = 'hidden';
    } catch (err) {
        console.error('Error fetching product for edit:', err);
        showNotification('Failed to load product details', 'error');
    }
};

window.closeEditModal = () => {
    document.getElementById('edit-modal').style.display = 'none';
    document.body.style.overflow = '';
};

window.saveProductEdits = async () => {
    const id = document.getElementById('edit-id').value;
    const name = document.getElementById('edit-name').value.trim();
    const price = parseFloat(document.getElementById('edit-price').value);
    const offer = document.getElementById('edit-offer').value ? parseFloat(document.getElementById('edit-offer').value) : null;
    const category = document.getElementById('edit-cat').value;
    const description = document.getElementById('edit-desc').value.trim();

    if (!name || isNaN(price) || price <= 0) {
        showNotification('Please enter a valid name and price', 'error');
        return;
    }

    document.getElementById('edit-saving').style.display = 'block';

    try {
        const { error } = await client.from('products').update({
            name,
            original_price: price,
            offer_price: offer,
            category,
            description
        }).eq('id', id);

        if (error) throw error;

        showNotification('✅ Product updated successfully!');
        closeEditModal();
        refreshInventory();
    } catch (err) {
        console.error('Error updating product:', err);
        showNotification('Failed to save changes: ' + err.message, 'error');
    } finally {
        document.getElementById('edit-saving').style.display = 'none';
    }
};