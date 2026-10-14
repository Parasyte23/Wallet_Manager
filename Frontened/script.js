console.log("🚨 SCRIPT.JS IS OFFICIALLY RUNNING!");

/* =====================================
   AUTHENTICATION LOGIC
===================================== */
function toggleAuth(type) {
    document.getElementById('loginForm').style.display = type === 'login' ? 'block' : 'none';
    document.getElementById('registerForm').style.display = type === 'register' ? 'block' : 'none';
}

window.handleAuth = async function(event, type) {
    event.preventDefault();
    
    const btn = event.target.querySelector('button');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processing...';

    const payload = {};
    if (type === 'login') {
        payload.email = document.getElementById('loginEmail').value;
        payload.password = document.getElementById('loginPassword').value;
    } else {
        payload.name = document.getElementById('regName').value;
        payload.email = document.getElementById('regEmail').value;
        payload.password = document.getElementById('regPassword').value;
    }

    try {
        const response = await fetch(`https://wallet-manager-backend-r5fq.onrender.com/api/auth/${type}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (response.ok) {
            // Save token and user data to local storage
            localStorage.setItem('token', data.token);
            localStorage.setItem('userId', data._id);
            localStorage.setItem('userName', data.name);
            localStorage.setItem('walletId', data.walletId);
            
            showToast(`Welcome, ${data.name}!`);
            checkAuthState(); // Switch UI to the main app
        } else {
            showToast(data.error || "Authentication failed", true);
        }
    } catch (error) {
        showToast("Network error occurred.", true);
    }
    
    btn.innerHTML = originalText;
}

// Add this global variable near the top of script.js
let socket;

// Update your checkAuthState function
function checkAuthState() {
    const token = localStorage.getItem('token');
    const userId = localStorage.getItem('userId');

    if (token) {
        document.getElementById('authWrapper').style.display = 'none';
        document.getElementById('mainApp').style.display = 'flex';
        
        const userName = localStorage.getItem('userName');
        document.querySelector('.user-info strong').innerText = userName;
        document.querySelector('.user-avatar').innerText = userName.charAt(0).toUpperCase();

        // Fill Profile Page Details
        document.getElementById('profilePageName').innerText = userName;
        document.getElementById('profilePageAvatar').innerText = userName.charAt(0).toUpperCase();

        // Fill Profile Page Details
        document.getElementById('profilePageName').innerText = userName;
        document.getElementById('profilePageAvatar').innerText = userName.charAt(0).toUpperCase();

        // Inject REAL Wallet Card data
        const walletNameEl = document.getElementById('walletCardName');
        const walletIdEl = document.getElementById('walletCardId');
        const realWalletId = localStorage.getItem('walletId'); // Get the real ID
        
        if (walletNameEl) walletNameEl.innerText = userName;
        if (walletIdEl && realWalletId) {
            walletIdEl.innerText = `Wallet ID: ${realWalletId}`;
        }

        // Fill Profile Page Details
        document.getElementById('profilePageName').innerText = userName;
        document.getElementById('profilePageAvatar').innerText = userName.charAt(0).toUpperCase();
        // Decode the JWT or use an extra localStorage variable to show the email if you saved it during login
        
        const greetingElement = document.querySelector('.greeting');
        if (greetingElement) greetingElement.innerText = `Good morning, ${userName.split(' ')[0]} 👋`;

        const dateButton = document.querySelector('.date-button');
        if (dateButton) {
            const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
            dateButton.innerHTML = `<i class="fa-regular fa-calendar"></i> ${today}`;
        }
        
        // NEW: Connect WebSocket and listen for incoming money
        if (!socket && typeof io !== 'undefined') {
            socket = io('https://wallet-manager-backend-r5fq.onrender.com');
            socket.emit('joinRoom', userId);

            socket.on('moneyReceived', (data) => {
                const msg = `You received ₹${data.amount.toLocaleString("en-IN")} from ${data.senderName}!`;
                showToast(msg);
                addNotification(msg, false);
                
                // Silently refresh UI data in the background
                fetchUserBalance();
                loadTransactions(4);
                updateDashboardStats();
            });
        } else if (typeof io === 'undefined') {
            console.warn("Socket.io library not found. Real-time features disabled, but app continues running.");
        }
        
        fetchUserBalance();
        loadTransactions(4);
        updateDashboardStats();
    } else {
        document.getElementById('authWrapper').style.display = 'flex';
        document.getElementById('mainApp').style.display = 'none';
    }
}

// Update your logout function to sever the connection
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    localStorage.removeItem('userName');
    
    clearNotifications(); 
    balance = 0;
    updateBalance(0);
    
    // NEW: Kill the socket connection on logout
    if (socket) {
        socket.disconnect();
        socket = null;
    }
    
    checkAuthState();
}

// Helper function to easily grab headers for all API calls
function getAuthHeaders() {
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
    };
}

async function fetchUserBalance() {
    const userId = localStorage.getItem('userId');
    if (!userId) return;

    try {
        const response = await fetch(`https://wallet-manager-backend-r5fq.onrender.com/api/wallet/user/${userId}`, {
            method: 'GET',
            headers: getAuthHeaders() // Pass the JWT here
        });
        const data = await response.json();
        
        if (response.ok) {
            balance = data.balance;
            updateBalance(data.balance); 
        }
    } catch (error) {
        console.error("Failed to fetch user balance", error);
    }
}

/* =====================================
   PAGE NAVIGATION
===================================== */

function showPage(pageId, clickedElement) {

    // Hide all pages
    const pages = document.querySelectorAll(".page");

    pages.forEach(page => {
        page.classList.remove("active-page");
    });


    // Show selected page
    const selectedPage = document.getElementById(pageId);

    if (selectedPage) {
        selectedPage.classList.add("active-page");
    }


    // Remove active class from navigation
    const navLinks = document.querySelectorAll(".nav-link");

    navLinks.forEach(link => {
        link.classList.remove("active");
    });


    // Add active class
    if (clickedElement) {
        clickedElement.classList.add("active");
    }


    // Fetch appropriate data based on the page viewed
    if (pageId === 'transactions') {
        fetchFilteredTransactions(); 
    } else if (pageId === 'dashboard') {
        loadTransactions(4); 
    } else if (pageId === 'analytics') {
        loadAnalytics();
    } else if (pageId === 'settings') { 
        loadSettingsData(); 
    }
}


/* =====================================
   UPDATE BALANCE
===================================== */
function updateBalance(newBalance) {
    // If no balance is passed, try to fetch it or default to 0
    const currentBalance = newBalance !== undefined ? newBalance : 0; 
    
    const balanceElement = document.getElementById("dashboardMainBalance"); // Ensure this matches your HTML ID
    const walletBalanceEl = document.getElementById("walletBalance"); // Ensure this matches your HTML ID
    const balance = document.getElementById("balance");
    const sendAvailable = document.getElementById("sendAvailable");
    const withdrawAvailable = document.getElementById("withdrawAvailable");

    const formattedBalance = "₹" + currentBalance.toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });

    const standardFormattedBalance = "₹" + currentBalance.toLocaleString("en-IN");

    if (balanceElement) {
        balanceElement.innerText = formattedBalance;
    }

    if(balance) {
        balance.innerText = formattedBalance;
    }

    if (walletBalanceEl) {
        walletBalanceEl.innerText = formattedBalance;
    }

    if (sendAvailable) {
        sendAvailable.innerText = standardFormattedBalance;
    }

    if (withdrawAvailable) {
        withdrawAvailable.innerText = standardFormattedBalance;
    }
}

async function updateDashboardStats() {
    const userId = localStorage.getItem('userId');
    if (!userId) return;

    try {
        // Fetch transaction counts
        const transRes = await fetch(`https://wallet-manager-backend-r5fq.onrender.com/api/wallet/transactions/${userId}?limit=1000`, { headers: getAuthHeaders() });
        const transData = await transRes.json();
        
        // Fetch financial aggregates
        const analyticsRes = await fetch(`https://wallet-manager-backend-r5fq.onrender.com/api/wallet/analytics/${userId}`, { headers: getAuthHeaders() });
        const analyticsData = await analyticsRes.json();

        if (transRes.ok && analyticsRes.ok) {
            let totalIncome = 0;
            let totalExpense = 0;

            analyticsData.typeStats.forEach(stat => {
                if (stat._id === 'credit') totalIncome = stat.total;
                if (stat._id === 'debit') totalExpense = stat.total;
            });

            document.getElementById('statIncome').innerText = `₹${totalIncome.toLocaleString("en-IN")}`;
            document.getElementById('statExpense').innerText = `₹${totalExpense.toLocaleString("en-IN")}`;
            document.getElementById('statTransactions').innerText = transData.count;
            document.getElementById('statSavings').innerText = `₹${(totalIncome - totalExpense).toLocaleString("en-IN")}`;
        }
    } catch (error) {
        console.error("Failed to load dashboard stats", error);
    }
}


/* =====================================
   ADD MONEY
===================================== */
async function addMoney(event) {
    event.preventDefault();

    const amountInput = document.getElementById("addAmount");
    const amount = Number(amountInput.value);
    const category = document.getElementById("addCategory").value;

    if (amount <= 0) {
        showToast("Enter a valid amount.", true);
        return;
    }

    try {
        const btn = event.target.querySelector('button');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processing...';

        const response = await fetch('https://wallet-manager-backend-r5fq.onrender.com/api/wallet/add', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({
                userId: localStorage.getItem('userId'),
                amount: amount,
                method: 'Bank Account',
                category: category
            })
        });

        const data = await response.json();

        if (response.ok) {
            balance = data.balance; 
            updateBalance(data.balance);
            
            const successMsg = `₹${amount.toLocaleString("en-IN")} added successfully!`;
            showToast(successMsg);
            addNotification(successMsg, false); // Explicitly log the success notification
            
            amountInput.value = "";
            loadTransactions(4); 
            updateDashboardStats(); 
        } else {
            showToast(data.error || "Failed to add money", true);
        }

        btn.innerHTML = originalText;
    } catch (error) {
        console.error("Error:", error);
        showToast("Network error occurred.", true);
    }
}

/* =====================================
   WITHDRAW MONEY
===================================== */
async function withdrawMoney(event) {
    event.preventDefault();

    const amountInput = document.getElementById("withdrawAmount");
    const amount = Number(amountInput.value);
    const category = document.getElementById("withdrawCategory").value;

    if (amount <= 0) {
        showToast("Enter a valid amount.", true);
        return;
    }

    if (amount > balance) {
        showToast("Insufficient wallet balance.", true);
        return;
    }

    try {
        const btn = event.target.querySelector('button');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processing...';

        const response = await fetch('https://wallet-manager-backend-r5fq.onrender.com/api/wallet/withdraw', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({
                userId: localStorage.getItem('userId'),
                amount: amount,
                destination: 'Bank Account',
                category: category
            })
        });

        const data = await response.json();

        if (response.ok) {
            balance = data.balance; 
            updateBalance(data.balance);
            
            const successMsg = `₹${amount.toLocaleString("en-IN")} withdrawn successfully!`;
            showToast(successMsg);
            addNotification(successMsg, false); // Explicitly log the success notification
            
            amountInput.value = "";
            loadTransactions(4); 
            updateDashboardStats(); 
        } else {
            showToast(data.error || "Failed to withdraw money", true);
        }

        btn.innerHTML = originalText;
    } catch (error) {
        console.error("Error:", error);
        showToast("Network error occurred.", true);
    }
}

/* =====================================
   SEND MONEY
===================================== */
async function sendMoney(event) {
    event.preventDefault();

    const receiverEmail = document.getElementById("receiver").value;
    const amountInput = document.getElementById("sendAmount");
    const descriptionInput = document.getElementById("sendDescription");
    const amount = Number(amountInput.value);
    const category = document.getElementById("sendCategory").value;

    if (!receiverEmail) {
        showToast("Enter receiver email.", true);
        return;
    }

    if (amount <= 0) {
        showToast("Enter a valid amount.", true);
        return;
    }

    // Prevent network request if we already know balance is too low
    if (amount > balance) {
        showToast("Insufficient wallet balance.", true);
        return;
    }

    try {
        const btn = event.target.querySelector('button');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processing...';

        const response = await fetch('https://wallet-manager-backend-r5fq.onrender.com/api/wallet/send', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({
                senderId: localStorage.getItem('userId'),
                receiverEmail: receiverEmail,
                amount: amount,
                description: descriptionInput.value,
                category : category
            })
        });

        const data = await response.json();

        if (response.ok) {
            balance = data.balance;
            updateBalance(data.balance);
            const successMsg = `₹${amount.toLocaleString("en-IN")} sent successfully!`;
            
            showToast(successMsg);
            addNotification(successMsg, false); // Add it exactly here instead
            
            document.getElementById("receiver").value = "";
            amountInput.value = "";
            descriptionInput.value = "";
            loadTransactions(4); 
            updateDashboardStats(); 
        } else {
            showToast(data.error || "Failed to send money", true);
        }

        btn.innerHTML = originalText;
    } catch (error) {
        console.error("Error:", error);
        showToast("Network error occurred.", true);
    }
}

/* =====================================
   SETTINGS & PROFILE UPDATE
===================================== */
// This populates the input field when they open the page
function loadSettingsData() {
    const currentName = localStorage.getItem('userName');
    const nameInput = document.getElementById('settingsName');
    if (nameInput && currentName) {
        nameInput.value = currentName;
    }
}

async function handleSettingsUpdate(event) {
    event.preventDefault();
    
    const newName = document.getElementById('settingsName').value;
    const userId = localStorage.getItem('userId');
    
    try {
        const btn = event.target.querySelector('button');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
        
        const response = await fetch('https://wallet-manager-backend-r5fq.onrender.com/api/auth/update-profile', {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify({ userId, newName })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Update local storage with the new name
            localStorage.setItem('userName', data.user.name);
            
            // Update UI elements instantly across the app
            document.querySelector('.user-info strong').innerText = data.user.name;
            document.querySelector('.user-avatar').innerText = data.user.name.charAt(0).toUpperCase();
            document.getElementById('profilePageName').innerText = data.user.name;
            document.getElementById('profilePageAvatar').innerText = data.user.name.charAt(0).toUpperCase();
            
            const greetingElement = document.querySelector('.greeting');
            if (greetingElement) greetingElement.innerText = `Good morning, ${data.user.name.split(' ')[0]} 👋`;
            
            showToast("Profile updated successfully!");
        } else {
            showToast(data.error || "Failed to update profile", true);
        }
        
        btn.innerHTML = originalText;
    } catch (error) {
        console.error("Settings update error:", error);
        showToast("Network error occurred.", true);
    }
}

/* =====================================
   QUICK ADD AMOUNT
===================================== */

function setAddAmount(amount) {

    document.getElementById("addAmount").value = amount;

}


/* =====================================
   TOAST MESSAGE
===================================== */
function showToast(message, isError = false) {
    const toast = document.getElementById("toast");
    const toastMessage = document.getElementById("toastMessage");
    const icon = toast.querySelector("i");

    toastMessage.innerText = message;

    if (isError) {
        icon.className = "fa-solid fa-circle-exclamation";
        icon.style.color = "#ef4444"; 
    } else {
        icon.className = "fa-solid fa-circle-check";
        icon.style.color = "#4ade80"; 
    }

    toast.classList.add("show");
    setTimeout(() => { toast.classList.remove("show"); }, 3000);

    
}


/* =====================================
   FETCH TRANSACTIONS (API INTEGRATION)
===================================== */

async function loadTransactions(limit = null, search = '', type = '') {
    // In a real app, this comes from JWT/Session
    const userId = localStorage.getItem('userId');
    if(!userId) return;  
    
    // Build the query string

    let url = `https://wallet-manager-backend-r5fq.onrender.com/api/wallet/transactions/${userId}?`;
    if (limit) url += `limit=${limit}&`;
    if (search) url += `search=${search}&`;
    if (type) url += `type=${type}`;

    try {
        const response = await fetch(url , {
            method : 'GET',
            headers : getAuthHeaders() // Pass the JWT here
        });
        const data = await response.json();

        if (response.ok) {
            const transactionsArray = data.data ? data.data : data; 
            renderTransactions(transactionsArray);
        } else {
            console.error(data.error);
        }
    } catch (error) {
        console.error("Failed to fetch transactions", error);
    }
}

function renderTransactions(transactions) {
    const tables = document.querySelectorAll('.transaction-table');
    
    // Emoji mapping for categories
    const categoryEmojis = {
        deposit: '📥 Deposit',
        transfer: '💸 Transfer',
        withdrawal: '🏧 Withdrawal',
        shopping: '🛍️ Shopping',
        bills: '🧾 Bills',
        food: '🍔 Food',
        other: '📦 Other'
    };
    
    tables.forEach(table => {
        const header = table.querySelector('.table-header');
        table.innerHTML = ''; 
        if (header) table.appendChild(header);

        transactions.forEach(tx => {
            const isCredit = tx.type === 'credit';
            const iconClass = isCredit ? 'received' : 'sent';
            const arrowClass = isCredit ? 'fa-arrow-down' : 'fa-arrow-up';
            const amountClass = isCredit ? 'positive' : 'negative';
            const sign = isCredit ? '+' : '-';
            
            // Look up the emoji, fallback to 'Other' if not found
            const categoryLabel = tx.category ? categoryEmojis[tx.category.toLowerCase()] || '📦 Other' : '📦 Other';
            
            const dateStr = new Date(tx.createdAt).toLocaleDateString('en-GB', {
                day: 'numeric', month: 'short', year: 'numeric'
            });

            const row = document.createElement('div');
            row.className = 'transaction-row';
            
            // Inserted the <span>${categoryLabel}</span> below the transaction-name div
            row.innerHTML = `
                <div class="transaction-name">
                    <div class="transaction-icon ${iconClass}">
                        <i class="fa-solid ${arrowClass}"></i>
                    </div>
                    <div>
                        <strong>${tx.title}</strong>
                        <small>${tx.description || ''}</small>
                    </div>
                </div>
                <span class="category-badge">${categoryLabel}</span>
                <span>${dateStr}</span>
                <strong class="amount ${amountClass}">
                    ${sign}₹${tx.amount.toLocaleString("en-IN")}
                </strong>
                <span class="status ${tx.status.toLowerCase() === 'completed' ? 'success' : tx.status.toLowerCase()}">
                    ${tx.status}
                </span>
            `;
            table.appendChild(row);
        });
    });
}

/* =====================================
   NOTIFICATIONS LOGIC
===================================== */
function toggleNotifications() {
    const dropdown = document.getElementById('notifDropdown');
    const badge = document.getElementById('notifBadge');
    
    // Toggle dropdown visibility
    dropdown.classList.toggle('show');
    
    // Hide the red dot once the user opens the panel
    if (badge) badge.style.display = 'none';
}

function clearNotifications() {
    const notifBody = document.getElementById('notifBody');
    notifBody.innerHTML = `
        <div class="notif-item" style="justify-content: center; border: none;">
            <p style="color: var(--text-light);">No new notifications</p>
        </div>
    `;
}

// Close the dropdown if the user clicks anywhere outside of it
document.addEventListener('click', (event) => {
    const notifContainer = document.querySelector('.notification-container');
    const dropdown = document.getElementById('notifDropdown');
    
    if (notifContainer && !notifContainer.contains(event.target)) {
        if (dropdown && dropdown.classList.contains('show')) {
            dropdown.classList.remove('show');
        }
    }
});

function addNotification(message, isError) {
    const notifBody = document.getElementById('notifBody');
    const badge = document.getElementById('notifBadge');
    
    // Turn the red dot back on
    if (badge) badge.style.display = 'block';
    
    // Remove the "No new notifications" text if it's there
    if (notifBody.innerText.includes('No new notifications')) {
        notifBody.innerHTML = '';
    }
    
    const icon = isError 
        ? '<i class="fa-solid fa-circle-exclamation" style="color: #ef4444;"></i>' 
        : '<i class="fa-solid fa-circle-check" style="color: #4ade80;"></i>';
        
    const title = isError ? 'Action Failed' : 'Transaction Successful';
    
    const newNotif = document.createElement('div');
    newNotif.className = 'notif-item';
    newNotif.innerHTML = `
        ${icon}
        <div>
            <strong>${title}</strong>
            <p>${message}</p>
        </div>
    `;
    
    // Prepends adds the newest notification to the very top of the list
    notifBody.prepend(newNotif);
}

/* =====================================
   SEARCH & FILTER LOGIC
===================================== */

const searchInput = document.getElementById('transactionSearch');
const filterSelect = document.getElementById('transactionFilter');

// Helper function to grab current inputs and fetch
async function fetchFilteredTransactions() {
    const userId = localStorage.getItem('userId');
    if (!userId) return;

    // Grab the values from your UI
    const type = document.getElementById('filterType') ? document.getElementById('filterType').value : 'all';
    const category = document.getElementById('filterCategory') ? document.getElementById('filterCategory').value : 'all';
    
    // Check both search bars (Global top bar OR local Transactions bar)
    const globalSearch = document.getElementById('globalSearchInput') ? document.getElementById('globalSearchInput').value : '';
    const localSearch = document.getElementById('transactionSearch') ? document.getElementById('transactionSearch').value : '';
    const searchTerm = globalSearch || localSearch; 

    try {
        // Build the dynamic URL. Note: limit=1000 ensures it doesn't get stuck at 4!
        let url = `https://wallet-manager-backend-r5fq.onrender.com/api/wallet/transactions/${userId}?limit=1000`;
        
        if (type !== 'all') url += `&type=${type}`;
        if (category !== 'all') url += `&category=${category}`;
        if (searchTerm) url += `&search=${encodeURIComponent(searchTerm)}`;

        const response = await fetch(url, { headers: getAuthHeaders() });
        const data = await response.json();

        if (response.ok) {
            // Pass the filtered data to your rendering function
            renderTransactions(data.data, 'transactionsListContainer'); 
        }
    } catch (error) {
        console.error("Error fetching filtered transactions:", error);
    }
}

/* =====================================
   ANALYTICS (CHART.JS)
===================================== */
let incomeExpenseChartInstance = null;
let categoryChartInstance = null;

async function loadAnalytics() {
    const userId = localStorage.getItem('userId');
    if (!userId) return;

    try {
        const response = await fetch(`https://wallet-manager-backend-r5fq.onrender.com/api/wallet/analytics/${userId}`, {
            method: 'GET',
            headers: getAuthHeaders()
        });
        
        const data = await response.json();
        
        if (response.ok) {
            renderCharts(data.typeStats, data.categoryStats);
        }
    } catch (error) {
        console.error("Failed to fetch analytics", error);
    }
}

function renderCharts(typeStats, categoryStats) {
    // 1. Process Data for Bar Chart (Income vs Expense)
    let totalIncome = 0;
    let totalExpense = 0;
    
    typeStats.forEach(stat => {
        if (stat._id === 'credit') totalIncome = stat.total;
        if (stat._id === 'debit') totalExpense = stat.total;
    });

    // 2. Process Data for Doughnut Chart (Categories)
    const categoryLabels = categoryStats.map(stat => stat._id.charAt(0).toUpperCase() + stat._id.slice(1));
    const categoryData = categoryStats.map(stat => stat.total);

    // Destroy existing charts if they exist to prevent hover glitches
    if (incomeExpenseChartInstance) incomeExpenseChartInstance.destroy();
    if (categoryChartInstance) categoryChartInstance.destroy();

    // 3. Draw Bar Chart
    const ctxBar = document.getElementById('incomeExpenseChart').getContext('2d');
    incomeExpenseChartInstance = new Chart(ctxBar, {
        type: 'bar',
        data: {
            labels: ['Total Summary'],
            datasets: [
                {
                    label: 'Income (₹)',
                    data: [totalIncome],
                    backgroundColor: '#4f46e5',
                    borderRadius: 5
                },
                {
                    label: 'Expenses (₹)',
                    data: [totalExpense],
                    backgroundColor: '#d9d7ff',
                    borderRadius: 5
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: { y: { beginAtZero: true } }
        }
    });

    // 4. Draw Doughnut Chart
    const ctxDoughnut = document.getElementById('categoryChart').getContext('2d');
    categoryChartInstance = new Chart(ctxDoughnut, {
        type: 'doughnut',
        data: {
            labels: categoryLabels.length > 0 ? categoryLabels : ['No Expenses'],
            datasets: [{
                data: categoryData.length > 0 ? categoryData : [1],
                backgroundColor: ['#4f46e5', '#f59e0b', '#3b82f6', '#10b981', '#6b7280'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '75%',
            plugins: {
                legend: { position: 'bottom' }
            }
        }
    });

    // Add this to the bottom of your existing renderCharts(typeStats, categoryStats) function:

    const legendContainer = document.getElementById('dynamicCategoryList');
    if (legendContainer) {
        legendContainer.innerHTML = ''; // Clear the fake HTML data
        
        const colors = ['#4f46e5', '#f59e0b', '#3b82f6', '#10b981', '#6b7280'];
        
        if (categoryStats.length === 0) {
            legendContainer.innerHTML = '<div><span>No spending data yet.</span></div>';
        } else {
            categoryStats.forEach((stat, index) => {
                const color = colors[index % colors.length];
                const name = stat._id.charAt(0).toUpperCase() + stat._id.slice(1);
                const formattedAmount = `₹${stat.total.toLocaleString("en-IN")}`;
                
                legendContainer.innerHTML += `
                    <div>
                        <span>
                            <i class="dot" style="background-color: ${color}"></i>
                            ${name}
                        </span>
                        <strong>${formattedAmount}</strong>
                    </div>
                `;
            });
        }
    }
}

// Trigger real-time fetch as the user types
if (searchInput) {
    // Adding a slight delay (debounce) prevents spamming the API on every keystroke
    let timeoutId;
    searchInput.addEventListener('input', () => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(fetchFilteredTransactions, 300);
    });
}

// Trigger fetch when a new category is selected
if (filterSelect) {
    filterSelect.addEventListener('change', fetchFilteredTransactions);
}

/* =====================================
   INITIALIZE & EVENT BINDINGS
===================================== */
document.addEventListener('DOMContentLoaded', () => {
    
    // 1. Check Authentication on Load
    checkAuthState();

    // 2. Global Search Bar (Top Nav)
    const globalSearch = document.getElementById('globalSearchInput');
    if (globalSearch) {
        globalSearch.addEventListener('input', (e) => {
            if (!document.getElementById('transactions').classList.contains('active-page')) {
                showPage('transactions', document.getElementById('nav-transactions'));
            }
            fetchFilteredTransactions(); 
        });
    }

    // 3. Local Search Bar (Transactions Page)
    const localSearch = document.getElementById('transactionSearch'); 
    if (localSearch) {
        localSearch.addEventListener('input', () => {
            fetchFilteredTransactions();
        });
    }
    
    // 4. Logout Button
    const logoutBtn = document.querySelector('.logout');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            logout();
        });
    }

    // 5. Draggable Floating Help Button
    const fab = document.getElementById('helpFAB');
    if (fab) {
        let isDragging = false, startX, startY, initialLeft, initialTop;

        fab.addEventListener('mousedown', dragStart);
        fab.addEventListener('touchstart', dragStart, { passive: false });

        function dragStart(e) {
            if (e.type === 'mousedown') e.preventDefault(); 
            isDragging = false;
            
            const clientX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX;
            const clientY = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY;

            const rect = fab.getBoundingClientRect();
            startX = clientX;
            startY = clientY;
            initialLeft = rect.left;
            initialTop = rect.top;

            fab.style.bottom = 'auto';
            fab.style.right = 'auto';
            fab.style.left = initialLeft + 'px';
            fab.style.top = initialTop + 'px';
            fab.style.transition = 'none';
            fab.style.cursor = 'grabbing';

            if (e.type === 'mousedown') {
                document.addEventListener('mousemove', drag);
                document.addEventListener('mouseup', dragEnd);
            } else {
                document.addEventListener('touchmove', drag, { passive: false });
                document.addEventListener('touchend', dragEnd);
            }
        }

        function drag(e) {
            const clientX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
            const clientY = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY;

            const dx = clientX - startX;
            const dy = clientY - startY;

            if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
                isDragging = true;
                if (e.type === 'touchmove') e.preventDefault(); 
                fab.style.left = (initialLeft + dx) + 'px';
                fab.style.top = (initialTop + dy) + 'px';
            }
        }

        function dragEnd(e) {
            fab.style.cursor = 'grab';
            document.removeEventListener('mousemove', drag);
            document.removeEventListener('mouseup', dragEnd);
            document.removeEventListener('touchmove', drag);
            document.removeEventListener('touchend', dragEnd);
        }

        fab.addEventListener('click', function(e) {
            if (isDragging) {
                e.preventDefault(); 
            }
        });
    }
});