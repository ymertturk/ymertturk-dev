// State management
let state = {
  shipments: [],
  sales: []
};

let parsedSalesPendingImport = null; // Temp holder for parsed sales
let stockChartInstance = null;
let currentStockView = "shipments"; // "shipments" or "products"

// Initialize app
function initApp() {
  // Secret PIN Security Check
  const pinGate = document.getElementById('pin-gate-overlay');
  const pinInput = document.getElementById('pin-input');
  const unlockBtn = document.getElementById('unlock-pin-btn');
  const pinError = document.getElementById('pin-error-text');

  const urlParams = new URLSearchParams(window.location.search);
  const isUnlocked = sessionStorage.getItem('fba_tracker_unlocked') === 'true' || urlParams.get('pin') === '1923';

  if (!isUnlocked && pinGate) {
      pinGate.style.display = 'flex';
  }

  const handleUnlock = () => {
      const val = pinInput.value.trim();
      if (val === '1923' || val === '1234') {
          sessionStorage.setItem('fba_tracker_unlocked', 'true');
          pinGate.style.display = 'none';
      } else {
          if (pinError) pinError.style.display = 'block';
          pinInput.value = '';
          pinInput.focus();
      }
  };

  if (unlockBtn) unlockBtn.addEventListener('click', handleUnlock);
  if (pinInput) {
      pinInput.addEventListener('keypress', (e) => {
          if (e.key === 'Enter') handleUnlock();
      });
  }

  loadState();
  
  // Initialize 24/7 Universal Cloud Auto-Sync
  if (window.UniversalCloudSync) {
    window.UniversalCloudSync.init('fba_tracker', (cloudData) => {
      if (cloudData && Array.isArray(cloudData.shipments)) {
        state = cloudData;
        renderApp();
      }
    });
  }

  // Set current date on header
  const todayOptions = { year: 'numeric', month: 'long', day: 'numeric' };
  document.getElementById("current-date-badge").textContent = new Date().toLocaleDateString('tr-TR', todayOptions);
  
  // Set default ship date to today in shipment modal
  document.getElementById("shipment-date-input").value = new Date().toISOString().split('T')[0];

  renderApp();
  setupEventListeners();
}

// Load data from LocalStorage
function loadState() {
  const savedState = localStorage.getItem("amazon_fba_tracker_state");
  if (savedState) {
    try {
      state = JSON.parse(savedState);
      // Schema migration / fallback checks
      if (!state.shipments) state.shipments = [];
      if (!state.sales) state.sales = [];
      
      // Auto-upgrade schema for box acceptance status and received quantities
      state.shipments.forEach(s => {
        if (!s.arrivalStatus) s.arrivalStatus = "Pending";
        if (s.products) {
          s.products.forEach(p => {
            if (p.receivedQuantity === undefined) {
              p.receivedQuantity = p.quantity;
            }
          });
        }
      });
    } catch (e) {
      console.error("Error parsing saved state, using mock data", e);
      state = window.INITIAL_MOCK_DATA ? JSON.parse(JSON.stringify(window.INITIAL_MOCK_DATA)) : { shipments: [], sales: [] };
    }
  } else {
    if (window.INITIAL_MOCK_DATA) {
      state = JSON.parse(JSON.stringify(window.INITIAL_MOCK_DATA));
      // Removed saveState() call here to prevent overwriting live cloud data on fresh browser load!
    }
  }
  // Double check state properties are arrays
  if (!Array.isArray(state.shipments)) state.shipments = [];
  if (!Array.isArray(state.sales)) state.sales = [];
}

// Save data to LocalStorage + Cloud Sync
function saveState() {
  localStorage.setItem("amazon_fba_tracker_state", JSON.stringify(state));
  if (window.UniversalCloudSync) {
    window.UniversalCloudSync.saveState("fba_tracker", state);
  }
}

// Reset data to empty
function clearAllData() {
  state = { shipments: [], sales: [] };
  saveState();
  renderApp();
}

// Load default mock data
function loadMockData() {
  if (window.INITIAL_MOCK_DATA) {
    state = JSON.parse(JSON.stringify(window.INITIAL_MOCK_DATA));
    saveState();
    renderApp();
    alert("Örnek demo verileri başarıyla yüklendi!");
  }
}

// Add a shipment
function addShipment(id, shipDate, products) {
  const exists = state.shipments.some(s => s.id.toLowerCase() === id.toLowerCase());
  if (exists) {
    alert("Bu koli numarası zaten mevcut!");
    return false;
  }

  state.shipments.push({
    id: id.trim().toUpperCase(),
    shipDate,
    arrivalStatus: "Pending",
    products: products.map(p => ({
      asin: p.asin.trim().toUpperCase(),
      modelCode: p.modelCode.trim().toUpperCase(),
      quantity: parseInt(p.quantity, 10) || 0,
      receivedQuantity: parseInt(p.quantity, 10) || 0,
      buyPrice: parseFloat(p.buyPrice) || 0,
      sellPrice: parseFloat(p.sellPrice) || 0
    }))
  });

  saveState();
  renderApp();
  return true;
}

// Delete a shipment
function deleteShipment(id) {
  if (confirm(`Bu koliyi (${id}) silmek istediğinize emin misiniz? Bu işlem tüm maliyet ve kâr hesaplamalarını etkileyecektir.`)) {
    state.shipments = state.shipments.filter(s => s.id !== id);
    saveState();
    renderApp();
  }
}

// Update shipment date
function updateShipmentDate(shipmentId, newDate) {
  const shipment = state.shipments.find(s => s.id === shipmentId);
  if (shipment && newDate) {
    shipment.shipDate = newDate;
    saveState();
    renderApp();
  }
}

// Update shipment prices inline
function updateProductPrices(shipmentId, asin, field, value) {
  const numVal = parseFloat(value) || 0;
  const shipment = state.shipments.find(s => s.id === shipmentId);
  if (shipment) {
    const product = shipment.products.find(p => p.asin === asin);
    if (product) {
      product[field] = numVal;
      saveState();
      renderApp();
    }
  }
}

// Add sales logs with duplicate check and status updates
function addSales(newSales) {
  let addedCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;

  newSales.forEach(sale => {
    const existingIndex = state.sales.findIndex(
      s => s.orderId.toLowerCase() === sale.orderId.toLowerCase() && 
           s.asin.toLowerCase() === sale.asin.toLowerCase()
    );

    if (existingIndex === -1) {
      state.sales.push({
        orderId: sale.orderId.trim(),
        asin: sale.asin.trim().toUpperCase(),
        quantity: parseInt(sale.quantity, 10) || 1,
        purchaseDate: sale.purchaseDate,
        status: sale.status || "Shipped",
        sellPrice: sale.sellPrice || null,
        email: sale.email || null,
        returnDetail: sale.returnDetail || null
      });
      addedCount++;
    } else {
      const existing = state.sales[existingIndex];
      let hasStatusChange = false;
      
      if (existing.status.toLowerCase() !== sale.status.toLowerCase()) {
        existing.status = sale.status;
        hasStatusChange = true;
        
        if (sale.status === "Returned") {
          existing.returnDetail = sale.returnDetail || {
            condition: "Defective",
            isConfirmedInStock: false,
            reimbursement: "Pending",
            reimbursementAmount: 0,
            reimbursementId: ""
          };
        } else if (sale.status === "RemovalReceived") {
          existing.returnDetail = sale.returnDetail || {
            condition: "Defective",
            disposition: "Removal",
            isConfirmedInStock: false,
            reimbursement: "RemovalReceived",
            reimbursementAmount: 0,
            reimbursementId: sale.orderId
          };
        } else {
          existing.returnDetail = null;
        }
      }
      
      let hasPriceChange = false;
      if (sale.sellPrice && existing.sellPrice !== sale.sellPrice) {
        existing.sellPrice = sale.sellPrice;
        hasPriceChange = true;
      }

      let hasEmailChange = false;
      if (sale.email && existing.email !== sale.email) {
        existing.email = sale.email;
        hasEmailChange = true;
      }

      if (hasStatusChange || hasPriceChange || hasEmailChange) {
        updatedCount++;
      } else {
        skippedCount++;
      }
    }
  });

  saveState();
  renderApp();
  return { addedCount, updatedCount, skippedCount };
}

// Delete a sale
function deleteSale(orderId, asin) {
  if (confirm("Bu satış kaydını silmek istediğinize emin misiniz? Bu işlem stokları geri kazandıracaktır.")) {
    state.sales = state.sales.filter(s => !(s.orderId === orderId && s.asin === asin));
    saveState();
    renderApp();
  }
}

// Update return details
function updateReturnDetail(orderId, asin, isConfirmedInStock, condition, reimbursement, reimbursementAmount, reimbursementId) {
  const sale = state.sales.find(s => s.orderId === orderId && s.asin === asin);
  if (sale) {
    sale.status = "Returned";
    if (isConfirmedInStock) {
      sale.returnDetail = {
        isConfirmedInStock: true,
        condition: "Sellable",
        disposition: "Sellable",
        reimbursement: "None",
        reimbursementAmount: 0,
        reimbursementId: ""
      };
    } else {
      sale.returnDetail = {
        isConfirmedInStock: false,
        condition,
        disposition: condition,
        reimbursement,
        reimbursementAmount: parseFloat(reimbursementAmount) || 0,
        reimbursementId: reimbursementId || ""
      };
    }
    saveState();
    renderApp();
  }
}

// Resolve pending orders manually (Satıldı / Satılmadı)
function resolvePendingOrder(orderId, asin, isSold) {
  const sale = state.sales.find(s => s.orderId === orderId && s.asin === asin);
  if (sale) {
    if (isSold) {
      sale.status = "Shipped";
      alert(`Sipariş (${orderId}) başarıyla SATILDI olarak işaretlendi ve stoktan düşüldü.`);
    } else {
      sale.status = "Cancelled";
      alert(`Sipariş (${orderId}) İPTAL EDİLDİ olarak işaretlendi ve bekleme listesinden çıkarıldı.`);
    }
    saveState();
    renderApp();
  }
}

// Recalculate everything (FIFO inventory, stock age, best sellers, financials)
function recalculateInventory() {
  const shipments = JSON.parse(JSON.stringify(state.shipments));
  shipments.sort((a, b) => new Date(a.shipDate) - new Date(b.shipDate));

  // Initialize tracking fields on shipments
  shipments.forEach(shipment => {
    if (!shipment.arrivalStatus) shipment.arrivalStatus = "Pending";
    
    shipment.products.forEach(p => {
      p.buyPrice = parseFloat(p.buyPrice) || 0;
      p.sellPrice = parseFloat(p.sellPrice) || 0;
      p.sold = 0;
      p.returnedUnsellable = 0;
      if (p.receivedQuantity === undefined) p.receivedQuantity = p.quantity;
      p.remaining = p.receivedQuantity;
    });
    shipment.totalQuantity = shipment.products.reduce((sum, p) => sum + p.quantity, 0);
    shipment.remainingQuantity = shipment.products.reduce((sum, p) => sum + p.receivedQuantity, 0);
    shipment.soldQuantity = 0;
    shipment.returnedQuantity = 0;
    shipment.realizedRevenue = 0;
    shipment.realizedProfit = 0;
  });

  // Aggregated ASIN tracker
  const asinMap = {};
  shipments.forEach(shipment => {
    shipment.products.forEach(p => {
      if (!asinMap[p.asin]) {
        asinMap[p.asin] = {
          asin: p.asin,
          modelCode: p.modelCode,
          totalSent: 0,
          totalSold: 0,
          totalReturnedUnsellable: 0,
          totalRemaining: 0,
          ageGroups: { '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0 }
        };
      }
      asinMap[p.asin].totalSent += p.quantity;
    });
  });

  // Sort sales by purchase date ascending to apply FIFO correctly
  const sales = JSON.parse(JSON.stringify(state.sales));
  sales.sort((a, b) => new Date(a.purchaseDate) - new Date(b.purchaseDate));

  const returnsList = [];
  let pendingReimbursementsCount = 0;
  
  // Financial metrics variables
  let totalRealizedRevenue = 0;
  let totalRealizedCost = 0;
  let totalUnsellableLoss = 0;
  let totalReimbursementsReceived = 0;
  // --- AUTO-RESOLVE RETURNS (Stock-level aware) ---
  // Rule: A returned product consumed 1 unit of box stock when originally shipped.
  // When stock reaches 0 and a subsequent sale occurs, that sale MUST have come from
  // the returned unit (proven sellable). Auto-resolve the oldest return in limbo.
  (() => {
    // 1. Initialize running stock per ASIN from shipments (total received)
    const runningStock = {};
    shipments.forEach(s => {
      s.products.forEach(p => {
        runningStock[p.asin] = (runningStock[p.asin] || 0) + p.receivedQuantity;
      });
    });

    // 2. Unresolved returns in limbo
    const returnsInLimbo = {}; // asin -> [sale, ...]

    // 3. Process all events chronologically
    sales.forEach(sale => {
      if (sale.status === 'Shipped') {
        const stock = runningStock[sale.asin] || 0;
        if (stock <= 0) {
          // No stock left in boxes — this sale can only come from returned unit(s) in limbo
          const limbo = returnsInLimbo[sale.asin];
          if (limbo && limbo.length > 0) {
            let qtyToResolve = sale.quantity || 1;
            while (qtyToResolve > 0 && limbo.length > 0) {
              const resolved = limbo.shift();
              if (!resolved.returnDetail) {
                resolved.returnDetail = { condition: 'Defective', reimbursement: 'AutoResolved', reimbursementAmount: 0 };
              }
              resolved.returnDetail.isConfirmedInStock = true;
              resolved.returnDetail.reimbursement = 'AutoResolved';
              qtyToResolve -= (resolved.quantity || 1);
            }
          }
        } else {
          // Serve sale from available box stock
          runningStock[sale.asin] = Math.max(0, stock - sale.quantity);
        }
      } else if (sale.status === 'Returned' || sale.status === 'RemovalReceived') {
        // The return was a past sale, so it consumed initial box stock when shipped!
        const stock = runningStock[sale.asin] || 0;
        runningStock[sale.asin] = Math.max(0, stock - sale.quantity);

        // Enter limbo as unconfirmed return
        if (sale.returnDetail && !sale.returnDetail.isConfirmedInStock) {
          if (!returnsInLimbo[sale.asin]) returnsInLimbo[sale.asin] = [];
          returnsInLimbo[sale.asin].push(sale);
        }
      }
    });
  })();

  // Process sales (FIFO deduction)
  sales.forEach(sale => {
    const isReturned = sale.status === 'Returned';
    const isRemoval = sale.status === 'RemovalReceived';
    const isConfirmedInStock = (isReturned || isRemoval) && sale.returnDetail && sale.returnDetail.isConfirmedInStock;
    const isUnsellable = (isReturned || isRemoval) && !isConfirmedInStock;
    
    if ((isReturned || isRemoval) && isConfirmedInStock) {
      // Auto-resolved: return was sellable (re-sold). Don't add to pending list.
      return; 
    }

    if (sale.status === 'Pending' || sale.status === 'Cancelled') {
      return;
    }

    if (isUnsellable) {
      returnsList.push(sale);
      if (sale.returnDetail && (sale.returnDetail.reimbursement === 'Pending' || sale.returnDetail.reimbursement === 'RemovalRequested')) {
        pendingReimbursementsCount++;
      }
    }

    let qtyToDeduct = sale.quantity;

    // Deduct from shipments containing this ASIN, oldest first
    for (let shipment of shipments) {
      if (qtyToDeduct <= 0) break;

      const product = shipment.products.find(p => p.asin === sale.asin);
      if (product && product.remaining > 0) {
        const deduct = Math.min(qtyToDeduct, product.remaining);
        product.remaining -= deduct;
        qtyToDeduct -= deduct;

        if (isUnsellable) {
          product.returnedUnsellable += deduct;
          shipment.returnedQuantity += deduct;
          
          totalUnsellableLoss += deduct * product.buyPrice;
          
          if (sale.returnDetail && sale.returnDetail.reimbursement === 'Reimbursed') {
            totalReimbursementsReceived += parseFloat(sale.returnDetail.reimbursementAmount) || 0;
          }
        } else {
          product.sold += deduct;
          shipment.soldQuantity += deduct;

          // Use sale-specific price if parsed, otherwise fallback to default
          const actualSellPrice = (sale.sellPrice !== null && sale.sellPrice !== undefined && sale.sellPrice > 0)
            ? sale.sellPrice
            : product.sellPrice;

          totalRealizedRevenue += deduct * actualSellPrice;
          totalRealizedCost += deduct * product.buyPrice;

          shipment.realizedRevenue += deduct * actualSellPrice;
          shipment.realizedProfit += deduct * (actualSellPrice - product.buyPrice);
        }
        
        shipment.remainingQuantity -= deduct;
      }
    }
  });

  // Calculate stock age and aggregate remaining quantities & expected financials
  const today = new Date();
  const ageGroups = { '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0 };
  let totalStockCost = 0; 
  let totalExpectedRemainingRevenue = 0;
  let totalExpectedRemainingProfit = 0;
  let totalSentCost = 0;

  shipments.forEach(shipment => {
    const shipDate = new Date(shipment.shipDate);
    const ageInDays = Math.max(0, Math.floor((today - shipDate) / (1000 * 60 * 60 * 24)));
    shipment.ageInDays = ageInDays;

    let group = '0-30';
    if (ageInDays > 90) group = '90+';
    else if (ageInDays > 60) group = '61-90';
    else if (ageInDays > 30) group = '31-60';

    shipment.ageGroup = group;

    shipment.products.forEach(p => {
      const asinData = asinMap[p.asin];
      if (asinData) {
        asinData.totalSold += p.sold;
        asinData.totalReturnedUnsellable += p.returnedUnsellable;
        asinData.totalRemaining += p.receivedQuantity - (p.sold + p.returnedUnsellable);
        
        asinData.ageGroups[group] += p.remaining;
        ageGroups[group] += p.remaining;
      }
      
      totalStockCost += p.remaining * p.buyPrice;
      totalSentCost += p.quantity * p.buyPrice;
      totalExpectedRemainingRevenue += p.remaining * p.sellPrice;
      totalExpectedRemainingProfit += p.remaining * (p.sellPrice - p.buyPrice);
    });

    shipment.totalBuyCost = shipment.products.reduce((sum, p) => sum + (p.quantity * p.buyPrice), 0);
    shipment.remainingStockCost = shipment.products.reduce((sum, p) => sum + (p.remaining * p.buyPrice), 0);
  });

  shipments.forEach(shipment => {
    shipment.totalExpectedRevenue = shipment.products.reduce((sum, p) => sum + (p.quantity * p.sellPrice), 0);
    shipment.expectedRemainingRevenue = shipment.products.reduce((sum, p) => sum + (p.remaining * p.sellPrice), 0);
  });

  const bestSellers = Object.values(asinMap)
    .filter(a => a.totalSold > 0)
    .sort((a, b) => b.totalSold - a.totalSold);

  const realizedNetProfit = totalRealizedRevenue - totalRealizedCost - totalUnsellableLoss + totalReimbursementsReceived;

  return {
    shipments,
    asinStats: Object.values(asinMap),
    returnsList,
    pendingReimbursementsCount,
    bestSellers,
    stockAgeSummary: ageGroups,
    financials: {
      activeStockCost: totalStockCost,
      totalSentCost: totalSentCost,
      realizedRevenue: totalRealizedRevenue,
      realizedNetProfit: realizedNetProfit,
      expectedRemainingRevenue: totalExpectedRemainingRevenue,
      expectedRemainingProfit: totalExpectedRemainingProfit,
      totalSentExpectedRevenue: shipments.reduce((sum, s) => sum + s.totalExpectedRevenue, 0)
    }
  };
}

// Box Arrival Control Action handlers
function confirmShipmentArrival(shipmentId) {
  const shipment = state.shipments.find(s => s.id === shipmentId);
  if (shipment) {
    shipment.arrivalStatus = "Arrived";
    shipment.products.forEach(p => {
      p.receivedQuantity = p.quantity;
    });
    saveState();
    renderApp();
  }
}

function toggleDiscrepancyForm(shipmentId) {
  const form = document.getElementById(`discrepancy-form-${shipmentId}`);
  if (form) {
    form.style.display = form.style.display === "none" ? "block" : "none";
  }
}

function submitShipmentDiscrepancy(shipmentId) {
  const shipment = state.shipments.find(s => s.id === shipmentId);
  if (shipment) {
    let hasDiscrepancy = false;
    shipment.products.forEach(p => {
      const input = document.getElementById(`received-qty-${shipmentId}-${p.asin}`);
      if (input) {
        const received = parseInt(input.value, 10);
        if (received < p.quantity) {
          p.receivedQuantity = received;
          hasDiscrepancy = true;
        } else {
          p.receivedQuantity = p.quantity;
        }
      }
    });

    shipment.arrivalStatus = hasDiscrepancy ? "Discrepancy" : "Arrived";
    saveState();
    renderApp();
    alert(hasDiscrepancy ? "Eksik teslimat kaydedildi ve Amazon destek talebi metni oluşturuldu." : "Koli sorunsuz teslim alınmış olarak kaydedildi.");
  }
}

function resetShipmentArrival(shipmentId) {
  const shipment = state.shipments.find(s => s.id === shipmentId);
  if (shipment) {
    shipment.arrivalStatus = "Pending";
    shipment.products.forEach(p => {
      p.receivedQuantity = p.quantity;
    });
    saveState();
    renderApp();
  }
}

// Copy case text
function copyCaseText(shipmentId) {
  const textEl = document.getElementById(`case-text-${shipmentId}`);
  if (textEl) {
    textEl.select();
    document.execCommand("copy");
    alert("Amazon Case metni panoya kopyalandı! Destek talebi açarken doğrudan yapıştırabilirsiniz.");
  }
}

// Parses MCF / Amazon Logistics / Multi-item Order text blocks
function parseBlockText(text) {
  const orders = [];
  const lines = text.split(/\r?\n/);
  
  let currentHeader = {
    orderId: '',
    purchaseDate: '',
    status: 'Shipped',
    email: null,
    isRemoval: false
  };

  let currentItems = [];
  let currentItem = null;

  function finalizeCurrentItem() {
    if (currentItem && currentItem.asin) {
      currentItems.push(currentItem);
      currentItem = null;
    }
  }

  function finalizeCurrentOrder() {
    finalizeCurrentItem();
    if (currentItems.length > 0) {
      currentItems.forEach(item => {
        orders.push({
          orderId: currentHeader.orderId || '',
          asin: item.asin,
          quantity: item.quantity || 1,
          purchaseDate: currentHeader.purchaseDate || new Date().toISOString().split('T')[0],
          status: currentHeader.status || 'Shipped',
          sellPrice: item.sellPrice !== undefined ? item.sellPrice : null,
          email: currentHeader.email || null,
          isRemoval: currentHeader.isRemoval || false,
          refundQuantity: item.refundQuantity || null
        });
      });
    }
    currentItems = [];
  }

  const months = {
    ocak: '01', subat: '02', şubat: '02', mart: '03', nisan: '04', mayis: '05', mayıs: '05',
    haziran: '06', temmuz: '07', agustos: '08', ağustos: '08', eylul: '09', eylül: '09',
    ekim: '10', kasim: '11', kasım: '11', aralik: '12', aralık: '12'
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line === '') continue;
    const lowerLine = line.toLowerCase();

    // 1. Date Detection (Marks start of a new order block)
    let dateMatch = line.match(/(\d{2})[./-](\d{2})[./-](\d{4})/);
    let purchaseDate = '';
    if (dateMatch) {
      purchaseDate = `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`;
    } else {
      dateMatch = line.match(/(\d{4})[./-](\d{2})[./-](\d{2})/);
      if (dateMatch) {
        purchaseDate = `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`;
      } else {
        const trDateMatch = line.match(/(\d{1,2})\s+([a-zA-ZşııöğüŞIİÖĞÜ]+)\s+(\d{4})/);
        if (trDateMatch) {
          const day = trDateMatch[1].padStart(2, '0');
          const monthName = trDateMatch[2].toLowerCase();
          const year = trDateMatch[3];
          if (months[monthName]) {
            purchaseDate = `${year}-${months[monthName]}-${day}`;
          }
        }
      }
    }

    if (purchaseDate) {
      finalizeCurrentOrder();
      currentHeader = {
        orderId: '',
        purchaseDate: purchaseDate,
        status: 'Shipped',
        email: null,
        isRemoval: false
      };
      
      // Look ahead for Order ID
      for (let j = 1; j <= 4; j++) {
        if (i + j < lines.length) {
          const nextLine = lines[i+j].trim();
          if (nextLine && !nextLine.includes(':') && !nextLine.includes('TRT') && /^[a-zA-Z0-9-]{6,25}$/.test(nextLine)) {
            currentHeader.orderId = nextLine;
            break;
          }
        }
      }
    }

    // 2. Order Header Metadata Parsing
    if (/^(satıcı sipariş kodu|sipariş kodu|order id|order-id)\s*:/i.test(line)) {
      const parts = line.split(':');
      if (parts[1]) currentHeader.orderId = parts[1].trim();
    }

    if (lowerLine.includes('satış kanalı: non-amazon') || lowerLine.includes('non-amazon') || lowerLine.includes('satış kanalı: amazon lojistik') || lowerLine.includes('removal') || lowerLine.includes('geri çekme')) {
      currentHeader.isRemoval = true;
    }

    const emailMatch = line.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    if (emailMatch) {
      currentHeader.email = emailMatch[0].trim();
    }

    // Status parsing
    const isShippedLine = (
      lowerLine === 'tamamlandı' || lowerLine === 'gönderildi' || lowerLine === 'teslim edildi' || 
      lowerLine === 'sevk edildi' || lowerLine === 'completed' || lowerLine === 'shipped' || lowerLine === 'delivered' ||
      (lowerLine.includes('teslim') && !lowerLine.includes('tarih'))
    );
    const isReturnedLine = (
      lowerLine.includes('iade edildi') || lowerLine.includes('iade tamamlandı') || 
      lowerLine.includes('geri ödeme yapıldı') || lowerLine.includes('para iadesi uygulandı') ||
      lowerLine.includes('refunded') || lowerLine.includes('returned') || (lowerLine === 'iade')
    );
    const isPendingLine = (
      lowerLine === 'beklemede' || lowerLine.includes('ödeme doğrulaması bekleniyor') ||
      lowerLine.includes('odeme dogrulamasi bekleniyor') || lowerLine.includes('payment verification') ||
      lowerLine.includes('verification required') || (lowerLine === 'pending')
    );

    if (isPendingLine) {
      currentHeader.status = 'Pending';
    } else if (isShippedLine) {
      currentHeader.status = 'Shipped';
    } else if (isReturnedLine) {
      currentHeader.status = 'Returned';
    }

    // 3. Item Level ASIN Detection
    let foundAsin = '';
    if (/^asin\s*:/i.test(line)) {
      foundAsin = line.replace(/^asin\s*:/i, '').trim().toUpperCase();
    } else if (!/^(sku|fnsku|msku|seller-sku|sellersku)\s*:/i.test(line)) {
      const words = line.split(/\s+/);
      for (let word of words) {
        const cleanWord = word.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
        if (cleanWord.length === 10 && (cleanWord.startsWith('B0') || /^[0-9]{2}/.test(cleanWord))) {
          foundAsin = cleanWord;
          break;
        }
      }
    }

    if (foundAsin) {
      if (currentItem && currentItem.asin) {
        // We hit a new item in the same order! Finalize the previous item.
        finalizeCurrentItem();
      }
      if (!currentItem) {
        currentItem = { asin: foundAsin, quantity: 1, sellPrice: null, refundQuantity: null };
      } else {
        currentItem.asin = foundAsin;
      }
    }

    // Item Quantity Detection
    if (/^(adet|miktar|qty|quantity|gönderilmemiş adet|gönderilen adet)\s*:/i.test(line) || lowerLine.includes('adet:')) {
      const qtyMatch = line.match(/\d+/);
      if (qtyMatch && currentItem) {
        currentItem.quantity = parseInt(qtyMatch[0], 10) || 1;
      }
    }

    // Item Price Detection
    const priceKeywords = ['toplam', 'tutar', 'price', 'total', '₺', '$', '£', '€', 'tl', 'try', 'usd', 'eur', 'gbp'];
    const hasPriceKeyword = priceKeywords.some(kw => lowerLine.includes(kw));
    if (hasPriceKeyword && currentItem) {
      let foundPrice = null;
      const pricePattern = /(?:₺|\$|£|€|TRY|TL|USD|EUR|GBP)\s*([\d.,]+)|([\d.,]+)\s*(?:₺|\$|£|€|TRY|TL|USD|EUR|GBP)/i;
      const priceMatch = line.match(pricePattern);
      if (priceMatch) {
        foundPrice = priceMatch[1] || priceMatch[2];
      } else {
        const matches = line.match(/\b[\d.,]+\b/g);
        if (matches) {
          let maxVal = -1;
          matches.forEach(m => {
            if (m === '2026' || m === '2027') return;
            let clean = m;
            if (clean.includes(',') && clean.includes('.')) {
              clean = clean.replace(/\./g, '').replace(/,/g, '.');
            } else if (clean.includes(',')) {
              const parts = clean.split(',');
              if (parts[1] && parts[1].length <= 2) {
                clean = parts[0] + '.' + parts[1];
              } else {
                clean = clean.replace(/,/g, '');
              }
            }
            const val = parseFloat(clean);
            if (!isNaN(val) && val > maxVal) {
              maxVal = val;
            }
          });
          if (maxVal > 0) foundPrice = String(maxVal);
        }
      }

      if (foundPrice) {
        let cleanPrice = foundPrice;
        if (cleanPrice.includes('.') && cleanPrice.includes(',')) {
          cleanPrice = cleanPrice.replace(/\./g, '').replace(/,/g, '.');
        } else if (cleanPrice.includes(',')) {
          const parts = cleanPrice.split(',');
          if (parts[1] && parts[1].length <= 2) {
            cleanPrice = parts[0] + '.' + parts[1];
          } else {
            cleanPrice = cleanPrice.replace(/,/g, '');
          }
        }
        const parsedPrice = parseFloat(cleanPrice);
        if (!isNaN(parsedPrice) && parsedPrice > 0) {
          currentItem.sellPrice = parsedPrice;
        }
      }
    }
  }

  finalizeCurrentOrder();
  return orders;
}

// Robust TSV/CSV and block parser
function parseTextData(text) {
  if (!text || !text.trim()) return [];

  if (text.includes("ASIN:") || text.includes("Satıcı sipariş kodu:") || text.includes("Satış kanalı:")) {
    const blockData = parseBlockText(text);
    if (blockData.length > 0) {
      const results = blockData.map(order => {
        let finalStatus = order.isRemoval ? "RemovalReceived" : order.status;
        let returnDetail = null;

        if (order.isRemoval) {
          returnDetail = {
            condition: "Defective",
            disposition: "Removal",
            isConfirmedInStock: false,
            reimbursement: "Pending",
            reimbursementAmount: 0,
            reimbursementId: order.orderId
          };
        } else if (order.status === "Returned") {
          returnDetail = {
            condition: "Defective",
            isConfirmedInStock: false,
            reimbursement: "Pending",
            reimbursementAmount: 0,
            reimbursementId: ""
          };
        }

        return {
          orderId: order.orderId || "REM-OR-" + Math.floor(Math.random()*100000),
          asin: order.asin,
          quantity: order.quantity,
          purchaseDate: order.purchaseDate,
          status: finalStatus,
          // Removal orders have no sell price — they are NOT sales
          sellPrice: order.isRemoval ? null : (order.sellPrice || null),
          email: order.email || null,
          returnDetail: returnDetail
        };
      });
      
      return {
        data: results,
        headers: ["Blok Formatı (Amazon Sipariş Detay)"],
        matchedColumns: {
          orderId: "Sipariş Kodu (Bulundu)",
          asin: "ASIN (Bulundu)",
          quantity: "Adet (Bulundu)",
          purchaseDate: "Tarih (Bulundu)",
          sellPrice: "Fiyat (Bulundu)",
          status: "Sipariş Durumu (Bulundu)"
        }
      };
    }
  }

  const lines = text.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);
  if (lines.length < 2) return []; 

  const firstLine = lines[0];
  const tabCount = (firstLine.match(/\t/g) || []).length;
  const commaCount = (firstLine.match(/,/g) || []).length;
  const semiCount = (firstLine.match(/;/g) || []).length;

  let delimiter = '\t'; 
  if (commaCount > tabCount && commaCount > semiCount) delimiter = ',';
  else if (semiCount > tabCount && semiCount > commaCount) delimiter = ';';

  const headers = firstLine.split(delimiter).map(h => h.trim().toLowerCase().replace(/["']/g, ''));
  
  let orderIdIdx = -1;
  let asinIdx = -1;
  let qtyIdx = -1;
  let dateIdx = -1;
  let statusIdx = -1;
  let modelIdx = -1; 
  let itemPriceIdx = -1;

  headers.forEach((header, index) => {
    if (header.includes("order-id") || header.includes("order id") || header.includes("sipariş no") || header.includes("siparis no") || header.includes("sipariş numarası") || header.includes("amazon-order-id") || header.includes("sipariş-no")) {
      orderIdIdx = index;
    }
    else if (header === "asin" || header.includes("product-asin") || header.includes("ürün asin") || header.includes("asin-kodu")) {
      asinIdx = index;
    }
    else if (header === "quantity" || header === "qty" || header === "adet" || header === "miktar" || header === "quantity-purchased") {
      qtyIdx = index;
    }
    else if (header.includes("date") || header.includes("tarih") || header.includes("purchase-date") || header.includes("sipariş tarihi")) {
      dateIdx = index;
    }
    else if (header.includes("status") || header.includes("durum") || header.includes("order-status") || header.includes("sipariş durumu")) {
      statusIdx = index;
    }
    else if (header.includes("model") || header.includes("sku") || header.includes("kod")) {
      modelIdx = index;
    }
    else if (header.includes("item-price") || header.includes("item price") || header.includes("price") || header.includes("fiyat") || header.includes("tutar") || header.includes("satış tutarı") || header.includes("toplam") || header.includes("total")) {
      itemPriceIdx = index;
    }
  });

  // Heuristic column detection fallbacks if headers are missing or not matched
  if (asinIdx === -1) {
    if (headers.length === 3) {
      asinIdx = 0;
      modelIdx = 1;
      qtyIdx = 2;
    } else {
      if (lines.length > 1) {
        const sampleCols = lines[1].split(delimiter);
        sampleCols.forEach((val, idx) => {
          const clean = val.trim().toUpperCase();
          if (clean.length === 10 && (clean.startsWith("B") || /^[0-9]/.test(clean))) {
            asinIdx = idx;
          } else if (/^\d+$/.test(clean) && qtyIdx === -1 && clean.length <= 3) {
            qtyIdx = idx;
          }
        });
      }
    }
  }

  if (orderIdIdx === -1 && lines.length > 1) {
    const sampleCols = lines[1].split(delimiter);
    for (let idx = 0; idx < sampleCols.length; idx++) {
      const val = sampleCols[idx].trim();
      if (/^\d{3}-\d{7}-\d{7}$/.test(val) || /^[a-zA-Z0-9-]{15,25}$/.test(val)) {
        orderIdIdx = idx;
        break;
      }
    }
  }

  if (itemPriceIdx === -1 && lines.length > 1) {
    const sampleCols = lines[1].split(delimiter);
    for (let idx = 0; idx < sampleCols.length; idx++) {
      const val = sampleCols[idx].trim();
      if (val.includes("₺") || val.includes("TL") || val.includes("$") || val.includes("€") || val.includes("£") || val.toUpperCase().includes("TRY")) {
        itemPriceIdx = idx;
        break;
      }
    }
  }

  const results = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(delimiter).map(c => c.trim().replace(/["']/g, ''));
    if (cols.length < Math.max(asinIdx, qtyIdx) + 1) continue;

    const rowData = {};
    
    rowData.asin = asinIdx !== -1 ? cols[asinIdx] : "";
    rowData.quantity = qtyIdx !== -1 ? parseInt(cols[qtyIdx], 10) || 1 : 1;
    rowData.modelCode = modelIdx !== -1 ? cols[modelIdx] : "";
    rowData.orderId = orderIdIdx !== -1 && cols[orderIdIdx] ? cols[orderIdIdx] : "MAN-OR-" + Math.floor(Math.random()*1000000);
    
    if (dateIdx !== -1 && cols[dateIdx]) {
      rowData.purchaseDate = parseFlexibleDate(cols[dateIdx]);
    } else {
      rowData.purchaseDate = new Date().toISOString().split('T')[0];
    }

    if (statusIdx !== -1 && cols[statusIdx]) {
      const rawStatus = cols[statusIdx].toLowerCase();
      if (rawStatus.includes("iade edildi") || rawStatus.includes("iade tamamlandı") || rawStatus.includes("geri ödeme yapıldı") || rawStatus.includes("refunded") || rawStatus.includes("returned")) {
        rowData.status = "Returned";
        rowData.returnDetail = {
          condition: "Defective",
          isConfirmedInStock: false,
          reimbursement: "Pending",
          reimbursementAmount: 0,
          reimbursementId: ""
        };
      } else if (rawStatus.includes("bekle") || rawStatus.includes("pending") || rawStatus.includes("doğrulama") || rawStatus.includes("dogrulama") || rawStatus.includes("verification")) {
        rowData.status = "Pending";
      } else {
        rowData.status = "Shipped";
      }
    } else {
      rowData.status = "Shipped";
    }

    // Parse sellPrice if price column is present
    if (itemPriceIdx !== -1 && cols[itemPriceIdx]) {
      const rawPrice = cols[itemPriceIdx].replace(/[^\d.,]/g, '').trim();
      let cleanPrice = rawPrice;
      if (cleanPrice.includes('.') && cleanPrice.includes(',')) {
        cleanPrice = cleanPrice.replace(/\./g, '').replace(/,/g, '.');
      } else if (cleanPrice.includes(',')) {
        const parts = cleanPrice.split(',');
        if (parts[1] && parts[1].length <= 2) {
          cleanPrice = parts[0] + '.' + parts[1];
        } else {
          cleanPrice = cleanPrice.replace(/,/g, '');
        }
      }
      rowData.sellPrice = parseFloat(cleanPrice) || null;
    } else {
      rowData.sellPrice = null;
    }

    // Extract Email from any column containing an email address
    let parsedEmail = null;
    for (let c = 0; c < cols.length; c++) {
      if (cols[c] && cols[c].includes("@") && /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(cols[c])) {
        parsedEmail = cols[c].trim();
        break;
      }
    }
    rowData.email = parsedEmail;

    if (rowData.asin) {
      const cleanAsin = rowData.asin.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
      if (cleanAsin.length === 10) {
        rowData.asin = cleanAsin;
        results.push(rowData);
      }
    }
  }

  return {
    data: results,
    headers: headers,
    matchedColumns: {
      orderId: orderIdIdx !== -1 ? headers[orderIdIdx] : "Otomatik Bulundu / Benzersiz",
      asin: asinIdx !== -1 ? headers[asinIdx] : "Otomatik Bulundu",
      quantity: qtyIdx !== -1 ? headers[qtyIdx] : "Varsayılan (1)",
      purchaseDate: dateIdx !== -1 ? headers[dateIdx] : "Bugün",
      status: statusIdx !== -1 ? headers[statusIdx] : "Gönderildi (Shipped)",
      modelCode: modelIdx !== -1 ? headers[modelIdx] : "Kayıtlı Stoktan Alınacak",
      sellPrice: itemPriceIdx !== -1 ? headers[itemPriceIdx] : "Otomatik Bulundu"
    }
  };
}

// Helper date parser
function parseFlexibleDate(dateStr) {
  if (!dateStr) return new Date().toISOString().split('T')[0];
  const str = String(dateStr).trim();
  
  // Format DD.MM.YYYY
  let match = str.match(/^(\d{2})[./-](\d{2})[./-](\d{4})/);
  if (match) {
    return `${match[3]}-${match[2]}-${match[1]}`;
  }
  
  // Format YYYY-MM-DD
  match = str.match(/^(\d{4})[./-](\d{2})[./-](\d{2})/);
  if (match) {
    return `${match[1]}-${match[2]}-${match[3]}`;
  }
  
  const parsed = Date.parse(str);
  if (!isNaN(parsed)) {
    return new Date(parsed).toISOString().split('T')[0];
  }
  
  return new Date().toISOString().split('T')[0];
}

// Dynamic UI Rendering
function renderApp() {
  const inv = recalculateInventory();

  // 1. Render Dashboard Tab KPIs
  const activeStock = inv.asinStats.reduce((sum, item) => sum + item.totalRemaining, 0);
  const totalSent = inv.asinStats.reduce((sum, item) => sum + item.totalSent, 0);
  const totalSold = state.sales.filter(s => s.status === "Shipped").reduce((sum, s) => sum + s.quantity, 0);
  const salesRate = totalSent > 0 ? Math.round((totalSold / totalSent) * 100) : 0;
  const totalReturns = inv.returnsList.length;

  document.getElementById("kpi-active-stock").textContent = activeStock;
  document.getElementById("kpi-total-sent").textContent = `Toplam Gönderilen: ${totalSent}`;
  
  document.getElementById("kpi-total-sales").textContent = totalSold;
  document.getElementById("kpi-sales-rate").textContent = `Satış Oranı: %${salesRate}`;

  // Update Inventory Summary Bar elements
  const totalBoxesCount = state.shipments.length;
  const boxesEl = document.getElementById("inv-summary-total-boxes");
  if (boxesEl) boxesEl.textContent = totalBoxesCount;
  
  const sentEl = document.getElementById("inv-summary-total-sent");
  if (sentEl) sentEl.textContent = totalSent;
  
  const remainingEl = document.getElementById("inv-summary-remaining-stock");
  if (remainingEl) remainingEl.textContent = activeStock;

  const formatCurrency = (val) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(val);

  document.getElementById("kpi-stock-cost").textContent = formatCurrency(inv.financials.activeStockCost);
  document.getElementById("kpi-total-cost-sent").textContent = `Toplam Gönderi Maliyeti: ${formatCurrency(inv.financials.totalSentCost)}`;

  document.getElementById("kpi-realized-revenue").textContent = formatCurrency(inv.financials.realizedRevenue);

  const expRemRevEl = document.getElementById("kpi-expected-remaining-revenue");
  if (expRemRevEl) expRemRevEl.textContent = formatCurrency(inv.financials.expectedRemainingRevenue);

  const totExpRevEl = document.getElementById("kpi-total-expected-revenue");
  if (totExpRevEl) totExpRevEl.textContent = `Toplam hedef ciro: ${formatCurrency(inv.financials.totalSentExpectedRevenue)}`;
  
  const oldExpRevEl = document.getElementById("kpi-expected-revenue");
  if (oldExpRevEl) oldExpRevEl.textContent = `Beklenen Kalan: ${formatCurrency(inv.financials.expectedRemainingRevenue)}`;

  const profitEl = document.getElementById("kpi-net-profit");
  profitEl.textContent = formatCurrency(inv.financials.realizedNetProfit);
  if (inv.financials.realizedNetProfit < 0) {
    profitEl.className = "kpi-value text-red";
  } else {
    profitEl.className = "kpi-value text-green";
  }
  document.getElementById("kpi-expected-profit").textContent = `Beklenen Kalan Kâr: ${formatCurrency(inv.financials.expectedRemainingProfit)}`;

  document.getElementById("kpi-pending-reimburse").textContent = inv.pendingReimbursementsCount;
  document.getElementById("kpi-reimburse-sub").textContent = `Toplam İade Edilen: ${totalReturns} ürün`;

  // Calculate Overall Daily Velocity across all products
  let totalDailyVel = 0;
  inv.asinStats.forEach(item => {
    let earliestDate = null;
    state.shipments.forEach(s => {
      if (s.products && s.products.some(p => p.asin === item.asin) && s.shipDate) {
        const d = new Date(s.shipDate);
        if (!isNaN(d.getTime()) && (!earliestDate || d < earliestDate)) earliestDate = d;
      }
    });
    const daysActive = earliestDate ? Math.max(1, Math.floor((new Date() - earliestDate) / (1000 * 60 * 60 * 24))) : 30;
    totalDailyVel += (item.totalSold / daysActive);
  });

  const avgDailyVel = Math.round(totalDailyVel * 10) / 10;
  const overallDaysOfSupply = totalDailyVel > 0 ? Math.round(activeStock / totalDailyVel) : 0;

  const velEl = document.getElementById("kpi-daily-velocity");
  if (velEl) velEl.textContent = `${avgDailyVel} adet/gün`;

  const dosEl = document.getElementById("kpi-days-of-supply");
  if (dosEl) dosEl.textContent = overallDaysOfSupply > 0 ? `Tahmini stok dayanma: ${overallDaysOfSupply} gün` : 'Stok Hareketsiz';

  // 2. Render Donut Chart
  drawStockAgeChart(inv.stockAgeSummary);

  // 3. Render Critical Stock Alerts
  const alertsContainer = document.getElementById("critical-stock-alerts");
  alertsContainer.innerHTML = "";

  const agingShipments = inv.shipments.filter(s => s.remainingQuantity > 0 && s.ageInDays > 60);
  agingShipments.sort((a, b) => b.ageInDays - a.ageInDays);

  if (agingShipments.length === 0) {
    alertsContainer.innerHTML = `
      <div style="text-align: center; color: var(--text-muted); padding: 40px 0; font-size: 13px;">
        🔍 Depoda 60 günden eski koli bulunmamaktadır. Harika!
      </div>
    `;
  } else {
    agingShipments.forEach(s => {
      const isCritical = s.ageInDays > 90;
      const alertClass = isCritical ? 'alert-item danger' : 'alert-item warning';
      const severityText = isCritical ? 'KRİTİK' : 'UYARI';
      
      const detailsHtml = s.products.filter(p => p.remaining > 0).map(p => 
        `• ${p.modelCode} (Kalan: ${p.remaining} adet | Fiyat: ${formatCurrency(p.sellPrice)})`
      ).join("<br>");

      alertsContainer.innerHTML += `
        <div class="${alertClass}">
          <div class="alert-details">
            <span class="alert-title">[${severityText}] ${s.id}</span>
            <span class="alert-subtitle">Depo Yaşı: <strong>${s.ageInDays} gün</strong> | Kalan Değer: ${formatCurrency(s.remainingStockCost)}</span>
            <div style="font-size: 11px; margin-top: 6px; color: var(--text-muted); line-height: 1.4;">
              ${detailsHtml}
            </div>
          </div>
          <button class="btn btn-sm btn-outline" style="border-radius: 4px; padding: 4px 8px;" onclick="focusShipment('${s.id}')">İncele</button>
        </div>
      `;
    });
  }

  // 4. Render Best Sellers Table
  const bestBody = document.getElementById("best-sellers-table-body");
  bestBody.innerHTML = "";
  
  if (inv.bestSellers.length === 0) {
    bestBody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; color: var(--text-muted); padding: 30px;">
          Gösterilecek satış verisi yok. Satış yükleyin veya mock verileri açın.
        </td>
      </tr>
    `;
  } else {
    const showAll = window._showAllBestSellers || false;
    const displayList = showAll ? inv.bestSellers : inv.bestSellers.slice(0, 5);
    
    displayList.forEach((item, idx) => {
      const rate = item.totalSent > 0 ? Math.round((item.totalSold / item.totalSent) * 100) : 0;
      bestBody.innerHTML += `
        <tr>
          <td style="color: var(--text-muted); font-size:11px; width:30px;">${idx + 1}.</td>
          <td><strong>${item.asin}</strong></td>
          <td>${item.modelCode}</td>
          <td>${item.totalSent}</td>
          <td><span class="text-green">${item.totalSold}</span></td>
          <td><span class="${item.totalRemaining === 0 ? 'text-muted' : ''}">${item.totalRemaining}</span></td>
          <td>
            <div style="display:flex; align-items:center; gap:8px;">
              <span class="badge badge-success">%${rate}</span>
            </div>
          </td>
        </tr>
      `;
    });
    
    if (!showAll && inv.bestSellers.length > 5) {
      bestBody.innerHTML += `
        <tr>
          <td colspan="7" style="text-align: center; padding: 10px;">
            <button class="btn btn-sm btn-outline" onclick="toggleAllBestSellers()" style="font-size:11px;">📊 Tamamını Göster (${inv.bestSellers.length} ürün)</button>
          </td>
        </tr>
      `;
    } else if (showAll && inv.bestSellers.length > 5) {
      bestBody.innerHTML += `
        <tr>
          <td colspan="7" style="text-align: center; padding: 10px;">
            <button class="btn btn-sm btn-outline" onclick="toggleAllBestSellers()" style="font-size:11px;">🔼 Sadece İlk 5'i Göster</button>
          </td>
        </tr>
      `;
    }
  }

  // 5. Render Pending Orders List
  const pendingListContainer = document.getElementById("pending-orders-list");
  pendingListContainer.innerHTML = "";
  
  const pendingOrders = state.sales.filter(s => s.status === "Pending");
  document.getElementById("kpi-pending-count-badge").textContent = pendingOrders.length;

  if (pendingOrders.length === 0) {
    pendingListContainer.innerHTML = `
      <div style="text-align: center; color: var(--text-muted); padding: 30px 0; font-size: 12px;">
        ⏳ Ödeme doğrulaması bekleyen sipariş bulunmamaktadır.
      </div>
    `;
  } else {
    pendingOrders.forEach(po => {
      const match = inv.asinStats.find(a => a.asin === po.asin);
      const modelCode = match ? match.modelCode : po.asin;
      
      pendingListContainer.innerHTML += `
        <div class="pending-order-item" style="border-bottom: 1px solid rgba(255,255,255,0.03); padding: 10px 0; font-size:11px; display:flex; justify-content:space-between; align-items:center;">
          <div style="display:flex; flex-direction:column; gap:2px; max-width:65%;">
            <span style="color:#fff; word-break:break-all;">Sipariş: <strong>${po.orderId}</strong></span>
            <span style="color:var(--text-muted);">${po.asin} (${modelCode})</span>
            <span style="color:var(--text-muted); font-size:9px;">Tarih: ${po.purchaseDate} | Adet: ${po.quantity}</span>
          </div>
          <div style="display:flex; gap:6px;">
            <button class="btn btn-sm btn-success" onclick="resolvePendingOrder('${po.orderId}', '${po.asin}', true)" style="padding: 4px 8px; font-size:10px; border-radius:4px;">Satıldı</button>
            <button class="btn btn-sm btn-danger" onclick="resolvePendingOrder('${po.orderId}', '${po.asin}', false)" style="padding: 4px 8px; font-size:10px; border-radius:4px;">İptal</button>
          </div>
        </div>
      `;
    });
  }

  // 6. Render Quick Stats
  const quickStats = document.getElementById("quick-stats-container");
  const totalBoxes = state.shipments.length;
  const avgBoxAge = totalBoxes > 0 
    ? Math.round(inv.shipments.reduce((sum, s) => sum + s.ageInDays, 0) / totalBoxes) 
    : 0;

  quickStats.innerHTML = `
    <div class="quick-stat-row">
      <span class="quick-stat-label">Toplam Gönderilen Koli</span>
      <span class="quick-stat-val">${totalBoxes} koli</span>
    </div>
    <div class="quick-stat-row">
      <span class="quick-stat-label">Ortalama Koli Yaşı</span>
      <span class="quick-stat-val">${avgBoxAge} gün</span>
    </div>
    <div class="quick-stat-row">
      <span class="quick-stat-label">Stoktaki Toplam Maliyet</span>
      <span class="quick-stat-val text-orange">${formatCurrency(inv.financials.activeStockCost)}</span>
    </div>
    <div class="quick-stat-row">
      <span class="quick-stat-label">Beklenen Toplam Kâr</span>
      <span class="quick-stat-val text-green">${formatCurrency(inv.financials.expectedRemainingProfit)}</span>
    </div>
    <div style="margin-top: 15px; text-align: center;">
      <button class="btn btn-sm btn-primary" style="width: 100%" onclick="switchTab('import')">📤 Yeni Satış Yükle</button>
    </div>
  `;

  // 7. Render Shipments List Tab
  const shipmentsList = document.getElementById("shipments-list-container");
  shipmentsList.innerHTML = "";

  const boxStatusFilter = (state && state.boxStatusFilter) || 'active';
  const activeBoxesCount = inv.shipments.filter(s => s.remainingQuantity > 0).length;
  const completedBoxesCount = inv.shipments.filter(s => s.remainingQuantity === 0).length;
  const allBoxesCount = inv.shipments.length;

  const countActiveEl = document.getElementById("box-count-active");
  if (countActiveEl) countActiveEl.textContent = activeBoxesCount;
  const countCompletedEl = document.getElementById("box-count-completed");
  if (countCompletedEl) countCompletedEl.textContent = completedBoxesCount;
  const countAllEl = document.getElementById("box-count-all");
  if (countAllEl) countAllEl.textContent = allBoxesCount;

  const btnActiveEl = document.getElementById("btn-filter-boxes-active");
  if (btnActiveEl) btnActiveEl.className = boxStatusFilter === 'active' ? 'btn btn-sm btn-primary' : 'btn btn-sm btn-outline';
  const btnCompletedEl = document.getElementById("btn-filter-boxes-completed");
  if (btnCompletedEl) btnCompletedEl.className = boxStatusFilter === 'completed' ? 'btn btn-sm btn-primary' : 'btn btn-sm btn-outline';
  const btnAllEl = document.getElementById("btn-filter-boxes-all");
  if (btnAllEl) btnAllEl.className = boxStatusFilter === 'all' ? 'btn btn-sm btn-primary' : 'btn btn-sm btn-outline';

  let displayShipments = [...inv.shipments].sort((a,b) => new Date(b.shipDate) - new Date(a.shipDate));
  if (boxStatusFilter === 'active') {
    displayShipments = displayShipments.filter(s => s.remainingQuantity > 0);
  } else if (boxStatusFilter === 'completed') {
    displayShipments = displayShipments.filter(s => s.remainingQuantity === 0);
  }

  if (displayShipments.length === 0) {
    if (boxStatusFilter === 'active') {
      shipmentsList.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; color: var(--text-muted); padding: 50px 0;">
          <h3>🎉 Aktif Stokta Bekleyen Koli Bulunmamaktadır!</h3>
          <p style="margin-top: 10px;">Tüm kolilerinizdeki ürünlerin satışı başarıyla tamamlandı.</p>
          <button class="btn btn-outline margin-top-20" onclick="setBoxStatusFilter('completed')">✅ Satışı Tükenmiş Kolileri İncele (${completedBoxesCount})</button>
        </div>
      `;
    } else if (boxStatusFilter === 'completed') {
      shipmentsList.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; color: var(--text-muted); padding: 50px 0;">
          <h3>Henüz Satışı Tükenmiş Koli Yok</h3>
          <p style="margin-top: 10px;">Satılan ürünleriniz tükenip stoğu 0 olan koliler burada arşivlenecektir.</p>
        </div>
      `;
    } else {
      shipmentsList.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; color: var(--text-muted); padding: 60px 0;">
          <h3>Henüz Koli Eklenmemiş</h3>
          <p style="margin-top: 10px;">Yeni bir FBA gönderi kolisi ekleyerek başlayın.</p>
          <button class="btn btn-primary margin-top-20" onclick="openModal('new-shipment-modal')">➕ Yeni Koli Ekle</button>
        </div>
      `;
    }
  } else {
    displayShipments.forEach(s => {
      const pctSold = s.totalQuantity > 0 ? Math.round((s.soldQuantity / s.totalQuantity) * 100) : 0;
      
      let ageBadgeClass = "badge-success";
      if (s.ageInDays > 90) ageBadgeClass = "badge-danger";
      else if (s.ageInDays > 60) ageBadgeClass = "badge-warning";
      
      const currentSubTab = (state.shipmentSubTabs && state.shipmentSubTabs[s.id]) || 'active';
      const isExpanded = state.expandedShipments && !!state.expandedShipments[s.id];

      const activeProdsCount = s.products.filter(p => p.remaining > 0).length;
      const completedProdsCount = s.products.filter(p => p.remaining <= 0).length;

      let filteredProducts = s.products;
      if (currentSubTab === 'active') {
        filteredProducts = s.products.filter(p => p.remaining > 0);
      } else if (currentSubTab === 'completed') {
        filteredProducts = s.products.filter(p => p.remaining <= 0);
      }

      let prodRows = "";
      if (filteredProducts.length === 0) {
        if (currentSubTab === 'active') {
          prodRows = `
            <tr>
              <td colspan="8" style="text-align: center; color: var(--text-muted); padding: 25px 10px;">
                🎉 Bu kolideki tüm ürünlerin satışı tamamlandı!<br>
                <span style="font-size:11px; color:#10b981; margin-top:4px; display:inline-block;">Satılan ürün detaylarını görmek için yukarıdaki <strong>"✅ Tamamı Satılanlar (${completedProdsCount})"</strong> sekmesine tıklayabilirsiniz.</span>
              </td>
            </tr>
          `;
        } else if (currentSubTab === 'completed') {
          prodRows = `
            <tr>
              <td colspan="8" style="text-align: center; color: var(--text-muted); padding: 20px 10px;">
                Bu kolide henüz tamamı satılmış bir ürün bulunmamaktadır.
              </td>
            </tr>
          `;
        } else {
          prodRows = `
            <tr>
              <td colspan="8" style="text-align: center; color: var(--text-muted); padding: 20px 10px;">
                Bu kolide gösterilecek ürün bulunmamaktadır.
              </td>
            </tr>
          `;
        }
      } else {
        prodRows = filteredProducts.map(p => `
          <tr style="${p.remaining === 0 ? 'opacity: 0.7; background: rgba(0,0,0,0.15);' : ''}">
            <td><strong>${p.asin}</strong></td>
            <td>${p.modelCode}</td>
            <td>${p.quantity}</td>
            <td><span class="text-green">${p.sold}</span></td>
            <td><span class="${p.returnedUnsellable > 0 ? 'text-red' : ''}">${p.returnedUnsellable}</span></td>
            <td><strong>${p.remaining}</strong> ${p.remaining === 0 ? '<span class="badge badge-secondary" style="font-size:9px;">Satıldı</span>' : ''}</td>
            <td>
              <input type="number" value="${p.buyPrice}" onchange="updateProductPrices('${s.id}', '${p.asin}', 'buyPrice', this.value)" style="width: 65px; background: rgba(0,0,0,0.3); border: 1px solid var(--glass-border); padding: 4px; border-radius: 4px; color: #fff; text-align:center;">
            </td>
            <td>
              <input type="number" value="${p.sellPrice}" onchange="updateProductPrices('${s.id}', '${p.asin}', 'sellPrice', this.value)" style="width: 65px; background: rgba(0,0,0,0.3); border: 1px solid var(--glass-border); padding: 4px; border-radius: 4px; color: #fff; text-align:center;">
            </td>
          </tr>
        `).join("");
      }

      // Render the Amazon Arrival Check Panel HTML
      let arrivalHtml = "";
      if (s.arrivalStatus === "Pending") {
        arrivalHtml = `
          <div class="arrival-control glass" style="margin-top:15px; padding:12px; border-radius:8px; border: 1px solid var(--glass-border); background: rgba(255,255,255,0.01);">
            <h5 style="margin-bottom:8px; font-size:12px; color:#fff; display:flex; justify-content:space-between; align-items:center;">
              <span>📦 Amazon Kabul Kontrolü</span>
              <span class="badge badge-warning" style="font-size:9px; padding:2px 6px;">Ulaşması Bekleniyor</span>
            </h5>
            <div style="display:flex; gap:10px;">
              <button class="btn btn-sm btn-success" onclick="confirmShipmentArrival('${s.id}')" style="font-size:11px; padding:6px 12px; flex-grow:1;">✅ Sorunsuz Teslim Edildi</button>
              <button class="btn btn-sm btn-outline" onclick="toggleDiscrepancyForm('${s.id}')" style="font-size:11px; padding:6px 12px; flex-grow:1;">⚠️ Eksik Ürün Var</button>
            </div>
            <div id="discrepancy-form-${s.id}" style="display:none; margin-top:12px; border-top:1px solid rgba(255,255,255,0.05); padding-top:10px;">
              <p style="font-size:10px; color:var(--text-muted); margin-bottom:8px;">Ulaşan adetleri giriniz (Gönderilenden azsa eksik kaydedilir):</p>
              ${s.products.map(p => `
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px; font-size:11px; color:#fff;">
                  <span>${p.asin} (${p.modelCode}) <span style="color:var(--text-muted); font-size:9px;">[Gönderilen: ${p.quantity}]</span></span>
                  <input type="number" id="received-qty-${s.id}-${p.asin}" value="${p.quantity}" min="0" max="${p.quantity}" style="width:50px; background:rgba(0,0,0,0.3); border:1px solid var(--glass-border); color:#fff; text-align:center; border-radius:4px; padding:2px; font-size:11px;">
                </div>
              `).join("")}
              <button class="btn btn-sm btn-primary" onclick="submitShipmentDiscrepancy('${s.id}')" style="font-size:10px; width:100%; margin-top:8px;">Eksik Ürünleri Raporla & Kaydet</button>
            </div>
          </div>
        `;
      } else if (s.arrivalStatus === "Arrived") {
        arrivalHtml = `
          <div class="arrival-control glass" style="margin-top:15px; padding:12px; border-radius:8px; border: 1px solid rgba(16,185,129,0.2); background: rgba(16,185,129,0.02); display:flex; justify-content:space-between; align-items:center;">
            <span style="font-size:12px; color:#10b981; font-weight:500;">✅ Tüm ürünler depoya sorunsuz ulaştı.</span>
            <button class="btn btn-sm btn-outline" onclick="resetShipmentArrival('${s.id}')" style="font-size:10px; border:none; padding:2px 6px;">Yeniden Kontrol</button>
          </div>
        `;
      } else if (s.arrivalStatus === "Discrepancy") {
        const missingItems = s.products.filter(p => p.receivedQuantity < p.quantity);
        let missingItemsListHtml = "";
        let caseText = "";

        if (missingItems.length > 0) {
          missingItemsListHtml = missingItems.map(p => 
            `• ${p.asin} (${p.modelCode}): <strong>${p.quantity - p.receivedQuantity} adet eksik</strong> (Kabul: ${p.receivedQuantity} / Gönderi: ${p.quantity})`
          ).join("<br>");

          if (missingItems.length === 1) {
            const p = missingItems[0];
            caseText = `Merhabalar,\n\n${s.id} no'lu kolide ${p.asin} no'lu üründe ${p.quantity - p.receivedQuantity} adet eksik var konuyla alakalı desteğinizi rica ediyorum.\n\nSaygılarımızla,`;
          } else {
            caseText = `Merhabalar,\n\n${s.id} no'lu kolide aşağıdaki ürünlerde eksik tespit edilmiştir:\n`;
            missingItems.forEach(p => {
              caseText += `- ${p.asin} no'lu üründe ${p.quantity - p.receivedQuantity} adet eksik var.\n`;
            });
            caseText += `\nKonuyla alakalı desteğinizi rica ediyorum.\n\nSaygılarımızla,`;
          }
        }

        arrivalHtml = `
          <div class="arrival-control glass" style="margin-top:15px; padding:12px; border-radius:8px; border: 1px solid rgba(239,68,68,0.2); background: rgba(239,68,68,0.02);">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
              <span style="font-size:12px; color:#ef4444; font-weight:600;">⚠️ Depoda Eksik Kabul Tespit Edildi!</span>
              <button class="btn btn-sm btn-outline" onclick="resetShipmentArrival('${s.id}')" style="font-size:10px; border:none; padding:2px 6px;">Yeniden Kontrol</button>
            </div>
            <div style="font-size:11px; margin-bottom:10px; color:var(--text-muted); line-height:1.4;">
              ${missingItemsListHtml}
            </div>
            <div style="margin-top:10px; border-top: 1px solid rgba(255,255,255,0.05); padding-top:10px;">
              <label style="font-size:10px; color:#fff; display:block; margin-bottom:4px; font-weight:500;">📋 Amazon Desteğe Açılacak Destek Metni (Case):</label>
              <textarea id="case-text-${s.id}" readonly style="width:100%; height:80px; background:rgba(0,0,0,0.4); border:1px solid var(--glass-border); border-radius:6px; color:#fff; font-size:11px; padding:6px; resize:none; font-family:inherit; line-height:1.4; outline:none;">${caseText}</textarea>
              <button class="btn btn-sm btn-success" onclick="copyCaseText('${s.id}')" style="font-size:10px; width:100%; margin-top:6px; padding:5px;">📋 Case Metnini Kopyala</button>
            </div>
          </div>
        `;
      }

      shipmentsList.innerHTML += `
        <div class="shipment-card glass" id="shipment-card-${s.id}">
          <div class="shipment-card-header">
            <div class="shipment-card-title">
              <h4>Koli: ${s.id}</h4>
              <div style="display:flex; align-items:center; gap:6px; font-size:11px; margin-top:4px; color:var(--text-muted);">
                <span>Tarih:</span>
                <input type="date" value="${s.shipDate}" onchange="updateShipmentDate('${s.id}', this.value)" style="background: rgba(0,0,0,0.3); border: 1px solid var(--glass-border); padding: 2px 4px; border-radius: 4px; color: #fff; font-size:11px; outline:none; font-family:inherit; cursor:pointer;">
              </div>
            </div>
            <div style="display:flex; flex-direction:column; align-items:flex-end; gap:6px;">
              <span class="badge ${ageBadgeClass}">${s.ageInDays} Günlük</span>
              <button class="btn btn-sm btn-outline text-red" style="padding: 2px 6px; border:none;" onclick="deleteShipment('${s.id}')">🗑️ Sil</button>
            </div>
          </div>

          <div class="box-financials" style="background: rgba(255,255,255,0.02); padding: 10px; border-radius: 8px; margin: 10px 0; border: 1px solid rgba(255,255,255,0.02); display:grid; grid-template-columns:1fr 1fr 1fr; gap:8px; font-size:11px;">
            <div>Box Maliyeti: <strong class="text-orange">${formatCurrency(s.totalBuyCost)}</strong></div>
            <div>Elde Edilen Ciro: <strong class="text-blue">${formatCurrency(s.realizedRevenue)}</strong></div>
            <div>Gerçekleşen Kâr: <strong class="text-green">${formatCurrency(s.realizedProfit)}</strong></div>
            <div>Hedef Koli Cirosu: <strong style="color:#a78bfa;">${formatCurrency(s.totalExpectedRevenue)}</strong></div>
            <div>Kalan Stok Değeri: <strong>${formatCurrency(s.remainingStockCost)}</strong></div>
            <div>Beklenen Kalan Ciro: <strong style="color:#38bdf8;">${formatCurrency(s.expectedRemainingRevenue)}</strong></div>
          </div>

          <div class="progress-container">
            <div class="progress-label">
              <span>Satış Oranı</span>
              <span>%${pctSold} (${s.soldQuantity} / ${s.totalQuantity})</span>
            </div>
            <div class="progress-bar-bg">
              <div class="progress-bar-fill" style="width: ${pctSold}%"></div>
            </div>
            <div style="display:flex; justify-content:space-between; font-size:11px; margin-top:8px; color:var(--text-muted); border-top:1px solid rgba(255,255,255,0.02); padding-top:6px;">
              <span>Kalan Stok: <strong>${s.remainingQuantity} adet</strong></span>
              ${s.returnedQuantity > 0 ? `<span class="text-red">Kullanılamaz İade: ${s.returnedQuantity}</span>` : ''}
            </div>
          </div>

          <!-- FBA Arrival Acceptance Control Panel -->
          ${arrivalHtml}

          <!-- Surface Subtabs Bar (Always visible on card) -->
          <div style="display:flex; justify-content:space-between; align-items:center; margin-top:12px; padding-top:10px; border-top:1px solid rgba(255,255,255,0.05); gap:6px; flex-wrap:wrap;">
            <div style="display:flex; gap:6px; flex-wrap:wrap;">
              <button class="btn btn-sm ${currentSubTab === 'active' ? 'btn-primary' : 'btn-outline'}" onclick="setShipmentSubTab('${s.id}', 'active')" style="font-size:10px; padding:3px 8px;">
                📦 Aktif Stoktakiler (${activeProdsCount})
              </button>
              <button class="btn btn-sm ${currentSubTab === 'completed' ? 'btn-primary' : 'btn-outline'}" onclick="setShipmentSubTab('${s.id}', 'completed')" style="font-size:10px; padding:3px 8px;">
                ✅ Tamamı Satılanlar (${completedProdsCount})
              </button>
              <button class="btn btn-sm ${currentSubTab === 'all' ? 'btn-primary' : 'btn-outline'}" onclick="setShipmentSubTab('${s.id}', 'all')" style="font-size:10px; padding:3px 8px;">
                📋 Tüm İçerik (${s.products.length})
              </button>
            </div>
            <button class="expand-toggle" onclick="toggleShipmentDetails('${s.id}')" id="expand-btn-${s.id}" style="margin:0; width:auto; padding:4px 10px; font-size:11px;">
              ${isExpanded ? '🔼 Tabloyu Gizle' : '🔽 Tabloyu Göster'}
            </button>
          </div>

          <!-- Expandable Content Table -->
          <div class="shipment-details ${isExpanded ? 'active' : ''}" id="shipment-details-${s.id}">
            <div class="table-responsive" style="margin-top:8px;">
              <table class="data-table small-text">
                <thead>
                  <tr>
                    <th>ASIN</th>
                    <th>Model</th>
                    <th>Adet</th>
                    <th>Satış</th>
                    <th>Hasar</th>
                    <th>Kalan</th>
                    <th>Alış (TL)</th>
                    <th>Satış (TL)</th>
                  </tr>
                </thead>
                <tbody>
                  ${prodRows}
                </tbody>
              </table>
            </div>
            <span style="font-size:10px; color:var(--text-muted); display:block; margin-top:10px;">💡 Fiyatları doğrudan kutucuklardan değiştirebilirsiniz. Değişiklikler anında kaydedilir.</span>
          </div>
        </div>
      `;
    });
  }

  // 8. Render Product Stocks view if active
  if (currentStockView === "products") {
    renderProductStockView();
  }

  // 9. Render Returns Tab Table
  const returnsBody = document.getElementById("returns-table-body");
  returnsBody.innerHTML = "";

  if (inv.returnsList.length === 0) {
    returnsBody.innerHTML = `
      <tr>
        <td colspan="9" style="text-align: center; color: var(--text-muted); padding: 40px;">
          Müşteri veya kargo tarafından hasar gören ya da iade edilen ürün bulunmamaktadır.
        </td>
      </tr>
    `;
  } else {
    inv.returnsList.forEach(r => {
      const matchingProduct = inv.asinStats.find(a => a.asin === r.asin);
      const modelCode = matchingProduct ? matchingProduct.modelCode : "-";

      let statusBadge = "badge-danger";
      let statusText = "Hasarlı / Kusurlu";
      
      const isConfirmed = r.returnDetail && r.returnDetail.isConfirmedInStock;
      const isRemoval = r.status === "RemovalReceived";

      if (isConfirmed) {
        statusBadge = "badge-success";
        statusText = "Stoka Girdi (Sellable)";
      } else if (isRemoval) {
        statusBadge = "badge-info";
        statusText = "Lojistik İadesi (Geri Çekme)";
      } else if (r.returnDetail && r.returnDetail.condition === "Customer Damaged") {
        statusText = "Müşteri Hasarlı";
      } else if (r.returnDetail && r.returnDetail.condition === "Carrier Damaged") {
        statusText = "Kargo Hasarlı";
      }

      let reimbBadge = "badge-danger";
      let reimbText = "Ödeme Alınamaz";
      
      if (isConfirmed) {
        reimbBadge = "badge-primary";
        reimbText = "Gerekmiyor (Stokta)";
      } else if (isRemoval) {
        reimbBadge = "badge-success";
        reimbText = "Geri Çekildi (Tamamlandı)";
      } else if (r.returnDetail) {
        if (r.returnDetail.reimbursement === "Pending") {
          reimbBadge = "badge-warning";
          reimbText = "Refund Bekliyor";
        } else if (r.returnDetail.reimbursement === "Reimbursed") {
          reimbBadge = "badge-success";
          reimbText = "Geri Ödendi";
        } else if (r.returnDetail.reimbursement === "RemovalRequested") {
          reimbBadge = "badge-info";
          reimbText = "Geri Çekme (Açık)";
        } else if (r.returnDetail.reimbursement === "RemovalReceived") {
          reimbBadge = "badge-success";
          reimbText = "Geri Çekildi (Teslim)";
        }
      }

      const refundAmountText = r.returnDetail && r.returnDetail.reimbursementAmount > 0 
        ? formatCurrency(r.returnDetail.reimbursementAmount) 
        : "-";

      returnsBody.innerHTML += `
        <tr>
          <td><span class="small-text">${r.orderId}</span></td>
          <td><strong>${r.asin}</strong></td>
          <td>${modelCode}</td>
          <td>${r.purchaseDate}</td>
          <td><span class="badge ${statusBadge}">${statusText}</span></td>
          <td><span class="badge ${reimbBadge}">${reimbText}</span></td>
          <td><strong>${refundAmountText}</strong></td>
          <td><span class="small-text font-mono">${(r.returnDetail && r.returnDetail.reimbursementId) || "-"}</span></td>
          <td>
            <div style="display:flex; gap:6px;">
              <button class="btn btn-sm btn-outline" onclick="openUpdateReturnModal('${r.orderId}', '${r.asin}', '${r.returnDetail ? r.returnDetail.condition : 'Defective'}', '${r.returnDetail ? r.returnDetail.reimbursement : 'Pending'}', '${r.returnDetail ? r.returnDetail.reimbursementId : ''}', '${r.returnDetail ? r.returnDetail.reimbursementAmount : 0}', ${isConfirmed})">✏️ Düzenle</button>
              <button class="btn btn-sm btn-outline text-red" style="border:none;" onclick="deleteSale('${r.orderId}', '${r.asin}')">🗑️ Sil</button>
            </div>
          </td>
        </tr>
      `;
    });
  }

  // 10. Render Customer Emails List
  renderCustomerEmails();
}

// Render customer consolidated email list
function renderCustomerEmails() {
  const tbody = document.getElementById("customers-table-body");
  if (!tbody) return;

  tbody.innerHTML = "";
  const salesWithEmail = state.sales.filter(s => s.email);

  if (salesWithEmail.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="4" style="text-align: center; color: var(--text-muted); padding: 40px;">
          Kayıtlı e-posta adresi bulunmamaktadır. E-posta bilgisi içeren yeni siparişler yapıştırın.
        </td>
      </tr>
    `;
    return;
  }

  // Sort by date descending
  const sorted = [...salesWithEmail].sort((a,b) => new Date(b.purchaseDate) - new Date(a.purchaseDate));

  sorted.forEach(s => {
    tbody.innerHTML += `
      <tr>
        <td><span class="small-text font-mono">${s.orderId}</span></td>
        <td><strong>${s.asin}</strong></td>
        <td>${s.purchaseDate}</td>
        <td><span class="text-blue" style="font-weight: 500;">${s.email}</span></td>
      </tr>
    `;
  });
}

// Copy all customer emails to clipboard (unique values)
function copyAllCustomerEmails() {
  const emails = state.sales.filter(s => s.email).map(s => s.email.trim());
  const uniqueEmails = [...new Set(emails)];

  if (uniqueEmails.length === 0) {
    alert("Kopyalanacak e-posta adresi bulunmamaktadır!");
    return;
  }

  const emailText = uniqueEmails.join("\n");
  
  const temp = document.createElement("textarea");
  temp.value = emailText;
  document.body.appendChild(temp);
  temp.select();
  document.execCommand("copy");
  document.body.removeChild(temp);
  
  alert(`${uniqueEmails.length} adet benzersiz e-posta adresi başarıyla panoya kopyalandı!`);
}

// Export customer emails to Excel (.xlsx)
function exportCustomerEmailsExcel() {
  const emails = state.sales.filter(s => s.email);
  if (emails.length === 0) {
    alert("Dışa aktarılacak e-posta adresi bulunmamaktadır!");
    return;
  }

  const uniqueMap = {};
  emails.forEach(s => {
    if (!uniqueMap[s.email.toLowerCase()]) {
      uniqueMap[s.email.toLowerCase()] = {
        "E-Posta Adresi": s.email.trim(),
        "Son Sipariş Tarihi": s.purchaseDate,
        "Son Sipariş ID": s.orderId,
        "ASIN": s.asin
      };
    }
  });

  const emailsData = Object.values(uniqueMap).sort((a, b) => b["Son Sipariş Tarihi"].localeCompare(a["Son Sipariş Tarihi"]));

  const wb = XLSX.book_new();
  const ws = XLSX.utils.json_to_sheet(emailsData);
  XLSX.book_append_sheet(wb, ws, "Müşteri Mailleri");
  
  XLSX.writeFile(wb, `Amazon_Musteri_Epostalari_${new Date().toISOString().split('T')[0]}.xlsx`);
}

// Render product consolidated stock report
function renderProductStockView() {
  const inv = recalculateInventory();
  const tbody = document.getElementById("products-stock-table-body");
  tbody.innerHTML = "";

  if (inv.asinStats.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; color: var(--text-muted); padding: 40px;">
          Gösterilecek envanter bulunmamaktadır. Excel arşiv yükleyin veya koli ekleyin.
        </td>
      </tr>
    `;
    return;
  }

  const sortedStats = [...inv.asinStats].sort((a, b) => a.asin.localeCompare(b.asin));

  sortedStats.forEach(item => {
    const distributionBadges = [];
    inv.shipments.forEach(s => {
      const prod = s.products.find(p => p.asin === item.asin);
      if (prod && prod.remaining > 0) {
        let badgeClass = "badge-primary";
        if (s.ageInDays > 90) badgeClass = "badge-danger";
        else if (s.ageInDays > 60) badgeClass = "badge-warning";
        
        distributionBadges.push(`
          <span class="badge ${badgeClass}" onclick="focusShipment('${s.id}')" style="cursor:pointer; margin-right:6px; margin-bottom:6px; font-size:11px;" title="Depo Yaşı: ${s.ageInDays} gün. Detaya gitmek için tıklayın.">
            ${s.id}: <strong>${prod.remaining}</strong> adet
          </span>
        `);
      }
    });

    let earliestDate = null;
    state.shipments.forEach(s => {
      if (s.products && s.products.some(p => p.asin === item.asin) && s.shipDate) {
        const d = new Date(s.shipDate);
        if (!isNaN(d.getTime()) && (!earliestDate || d < earliestDate)) earliestDate = d;
      }
    });
    const daysActive = earliestDate ? Math.max(1, Math.floor((new Date() - earliestDate) / (1000 * 60 * 60 * 24))) : 30;
    const dailyVel = Math.round((item.totalSold / daysActive) * 100) / 100;
    const daysOfSupply = dailyVel > 0 ? Math.round(item.totalRemaining / dailyVel) : 0;

    let supplyBadgeClass = "badge-success";
    let supplyText = `${daysOfSupply} Gün`;
    if (daysOfSupply === 0) {
      supplyBadgeClass = "badge-secondary";
      supplyText = "Hareketsiz";
    } else if (daysOfSupply < 15) {
      supplyBadgeClass = "badge-danger";
      supplyText = `⚠️ ${daysOfSupply} Gün (Kritik)`;
    } else if (daysOfSupply < 30) {
      supplyBadgeClass = "badge-warning";
      supplyText = `⚡ ${daysOfSupply} Gün`;
    }

    const distHtml = distributionBadges.length > 0 
      ? distributionBadges.join("") 
      : "<span class='text-muted' style='font-size:11px;'>Depoda Kalmadı</span>";

    tbody.innerHTML += `
      <tr class="product-stock-row" data-search="${item.asin.toLowerCase()} ${item.modelCode.toLowerCase()}">
        <td><strong>${item.asin}</strong></td>
        <td>${item.modelCode}</td>
        <td>${item.totalSent}</td>
        <td><span class="text-green">${item.totalSold}</span></td>
        <td><span class="${item.totalReturnedUnsellable > 0 ? 'text-red' : ''}">${item.totalReturnedUnsellable}</span></td>
        <td><strong>${item.totalRemaining}</strong></td>
        <td><span class="badge badge-info" style="font-size:11px;">⚡ ${dailyVel} adet/gün</span></td>
        <td><span class="badge ${supplyBadgeClass}" style="font-size:11px;">${supplyText}</span></td>
        <td>
          <div style="display:flex; flex-wrap:wrap; align-items:center;">
            ${distHtml}
          </div>
        </td>
      </tr>
    `;
  });
}

// Search filter for product stock table
function filterProductStockTable() {
  const query = document.getElementById("product-stock-search").value.toLowerCase().trim();
  const rows = document.querySelectorAll(".product-stock-row");
  
  rows.forEach(row => {
    const searchText = row.getAttribute("data-search");
    if (searchText.includes(query)) {
      row.style.display = "";
    } else {
      row.style.display = "none";
    }
  });
}

// Toggle stock view tab mode
function toggleStockView(viewMode) {
  currentStockView = viewMode;
  const btnShipments = document.getElementById("btn-view-shipments");
  const btnProducts = document.getElementById("btn-view-products");
  
  const shipmentsGrid = document.getElementById("shipments-list-container");
  const productsStockContainer = document.getElementById("products-stock-container");

  if (viewMode === "shipments") {
    if (btnShipments) btnShipments.classList.add("active");
    if (btnProducts) btnProducts.classList.remove("active");
    if (shipmentsGrid && shipmentsGrid.style) shipmentsGrid.style.display = "grid";
    if (productsStockContainer && productsStockContainer.style) productsStockContainer.style.display = "none";
  } else {
    if (btnShipments) btnShipments.classList.remove("active");
    if (btnProducts) btnProducts.classList.add("active");
    if (shipmentsGrid && shipmentsGrid.style) shipmentsGrid.style.display = "none";
    if (productsStockContainer && productsStockContainer.style) productsStockContainer.style.display = "block";
    renderProductStockView();
  }
}

// Multi-Sheet Excel Parser using SheetJS (Advanced Column Detection)
function handleExcelImport(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(evt) {
    try {
      const data = new Uint8Array(evt.target.result);
      const workbook = XLSX.read(data, { type: 'array', cellDates: true });
      
      let totalParsedShipments = 0;
      let totalParsedProducts = 0;
      const parsedProducts = [];

      workbook.SheetNames.forEach(sheetName => {
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        if (rows.length < 2) return; 

        // Scan columns to find ASIN columns (support for side-by-side horizontal tables and permissive 10-char ISBN/ASIN)
        const tables = [];
        const maxCols = rows.reduce((max, r) => Math.max(max, r ? r.length : 0), 0);

        for (let c = 0; c < maxCols; c++) {
          let isAsinColumn = false;
          for (let r = 0; r < Math.min(rows.length, 40); r++) {
            const row = rows[r];
            if (row && row[c]) {
              const cellVal = String(row[c]).trim().toUpperCase();
              if (/^[0-9A-Z]{10}$/.test(cellVal)) {
                isAsinColumn = true;
                break;
              }
            }
          }

          if (isAsinColumn) {
            const table = {
              asinIdx: c,
              modelIdx: c + 1,
              qtyIdx: c + 2,
              soldIdx: -1,
              buyIdx: -1,
              sellIdx: -1,
              currentKoliNo: "",
              koliDate: new Date().toISOString().split('T')[0]
            };

            // Scan headers near column c (from c to c+6) in the first 100 rows
            rows.forEach((row, rowIndex) => {
              if (!row || rowIndex > 100) return;
              for (let idx = c; idx < Math.min(row.length, c + 7); idx++) {
                const cell = row[idx];
                if (typeof cell === 'string') {
                  const val = cell.toLowerCase().trim();
                  if (val.includes('model') || val.includes('sku') || val.includes('kod') || val.includes('tanım') || val.includes('tanim') || val.includes('adı') || val.includes('adi') || val.includes('name')) {
                    table.modelIdx = idx;
                  }
                  else if (val === 'adet' || val === 'miktar' || val === 'qty' || val === 'quantity' || val.includes('adet') || val.includes('gönderilen')) {
                    table.qtyIdx = idx;
                  }
                  else if (val === 'satılan' || val === 'satilan' || val === 'sold' || val.includes('satılan') || val.includes('satilan') || val.includes('satis adet') || val.includes('satış adet')) {
                    table.soldIdx = idx;
                  }
                  else if (val === 'alış' || val === 'alis' || val === 'maliyet' || val === 'buy' || val === 'cost' || val.includes('maliyet') || val.includes('alış') || val.includes('alis') || val.includes('alıs')) {
                    table.buyIdx = idx;
                  }
                  else if (val === 'satış' || val === 'satis' || val === 'fiyat' || val === 'sell' || val === 'price' || val.includes('satış') || val.includes('satis') || val.includes('fiyat') || val.includes('satıs')) {
                    table.sellIdx = idx;
                  }
                }
              }
            });

            // Fallback for Qty column if still not found
            if (table.qtyIdx === c + 2) {
              let foundQty = false;
              for (let r = 0; r < Math.min(rows.length, 40); r++) {
                const row = rows[r];
                if (!row || !row[c]) continue;
                for (let idx = c + 1; idx < Math.min(row.length, c + 5); idx++) {
                  const cell = row[idx];
                  if (idx !== table.modelIdx && typeof cell === 'number' && Number.isInteger(cell) && cell > 0 && cell < 1000) {
                    table.qtyIdx = idx;
                    foundQty = true;
                    break;
                  }
                }
                if (foundQty) break;
              }
            }

            tables.push(table);
            c = Math.max(c, table.modelIdx, table.qtyIdx, table.soldIdx, table.buyIdx, table.sellIdx);
          }
        }

        // Skip sheet if no tables containing ASIN columns were matched
        if (tables.length === 0) return;

        // ---- PRE-SCAN: Build koliNo → date map ----
        // For each table block (minCol...maxCol), scan rows top-to-bottom.
        // When an FBA koli number is seen anywhere in those columns, set currentKoli.
        // When a date is seen anywhere in those columns, assign dateStr to currentKoli.
        const koliDateMap = {};

        function parseDateValue(cell) {
          if (cell instanceof Date && !isNaN(cell.getTime())) {
            // Add 12 hours to normalize midnight Date objects across any UTC/local timezone shift
            const norm = new Date(cell.getTime() + 12 * 60 * 60 * 1000);
            const y = norm.getUTCFullYear();
            const m = String(norm.getUTCMonth() + 1).padStart(2, '0');
            const d = String(norm.getUTCDate()).padStart(2, '0');
            return `${y}-${m}-${d}`;
          }
          if (typeof cell === 'string') {
            const tr = cell.trim();
            const dmy = tr.match(/(\d{1,2})[./-](\d{1,2})[./-](\d{4})/);
            if (dmy && parseInt(dmy[2]) <= 12 && parseInt(dmy[1]) <= 31) {
              return `${dmy[3]}-${dmy[2].padStart(2,'0')}-${dmy[1].padStart(2,'0')}`;
            }
            const ymd = tr.match(/(\d{4})[./-](\d{1,2})[./-](\d{1,2})/);
            if (ymd && parseInt(ymd[2]) <= 12 && parseInt(ymd[3]) <= 31) {
              return `${ymd[1]}-${ymd[2].padStart(2,'0')}-${ymd[3].padStart(2,'0')}`;
            }
          }
          if (typeof cell === 'number' && cell > 40000 && cell < 60000) {
            const epoch = new Date(Date.UTC(1899, 11, 30));
            const dt = new Date(epoch.getTime() + (Math.round(cell) + 0.5) * 86400000);
            return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`;
          }
          return null;
        }

        tables.forEach(t => {
          const colCandidates = [t.asinIdx, t.modelIdx, t.qtyIdx, t.soldIdx, t.buyIdx, t.sellIdx].filter(i => i >= 0);
          const tMinCol = Math.max(0, Math.min(...colCandidates) - 1);
          const tMaxCol = Math.max(...colCandidates) + 3; // buffer for adjacent columns

          let currentKoli = null;
          rows.forEach(row => {
            if (!row) return;
            // First check for FBA header in this row block
            for (let c = tMinCol; c <= Math.min(tMaxCol, row.length - 1); c++) {
              const cell = row[c];
              if (!cell && cell !== 0) continue;
              const strVal = String(cell).trim().toUpperCase();
              const fbaMatch = strVal.match(/FBA[0-9A-Z]{7,}/);
              if (fbaMatch) {
                currentKoli = fbaMatch[0];
              }
            }
            // Next check for date in this row block
            for (let c = tMinCol; c <= Math.min(tMaxCol, row.length - 1); c++) {
              const dateStr = parseDateValue(row[c]);
              if (dateStr && currentKoli) {
                koliDateMap[currentKoli] = dateStr;
              }
            }
          });
        });
        // ---- END PRE-SCAN ----
        console.log('🗓️ KoliDateMap (pre-scan result):', JSON.stringify(koliDateMap, null, 2));


        rows.forEach((row, rowIndex) => {
          if (!row || row.length === 0) return;

          // Process each table column block independently
          tables.forEach(t => {
            let isProductRow = false;
            const cellValue = row[t.asinIdx];
            if (cellValue) {
              const asinVal = String(cellValue).trim().toUpperCase();
              if (/^[0-9A-Z]{10}$/.test(asinVal)) {
                isProductRow = true;
              }
            }

            // Only scan for Koli No if this is not a product row
            if (!isProductRow) {
              // --- STEP 1: Scan for Date in the ENTIRE row FIRST ---
              let foundDateInRow = false;
              for (let c = 0; c < (row ? row.length : 0); c++) {
                const dateStr = parseDateValue(row[c]);
                if (dateStr) {
                  t.koliDate = dateStr;
                  foundDateInRow = true;
                }
              }

              // --- STEP 2: If this row is NOT a date-only row, check for Koli Number ---
              const blockCols = [t.asinIdx, t.modelIdx, t.qtyIdx, t.soldIdx, t.buyIdx, t.sellIdx].filter(idx => idx !== -1);
              const minCol = blockCols.length > 0 ? Math.min(...blockCols) : 0;
              const maxCol = blockCols.length > 0 ? Math.max(...blockCols) : 0;
              const blockCells = [];
              for (let c = minCol; c <= maxCol; c++) {
                if (row[c] !== null && row[c] !== undefined && String(row[c]).trim() !== "") {
                  blockCells.push(row[c]);
                }
              }

              if (!foundDateInRow) {
                if (blockCells.length >= 1 && blockCells.length <= 2) {
                  const val = String(blockCells[0]).trim().toUpperCase();
                  const isHeaderWord = ['asin', 'model', 'kodu', 'adet', 'miktar', 'toplam', 'alış', 'satış', 'satis', 'alis', 'alıs', 'satıs'].some(hw => val.toLowerCase().includes(hw));
                  if (!isHeaderWord && val.length >= 4 && val.length <= 40) {
                    const fbaMatch = val.match(/FBA[0-9A-Z]{7,}/);
                    if (fbaMatch) {
                      t.currentKoliNo = fbaMatch[0];
                    } else {
                      t.currentKoliNo = val.replace(/KOLİ|KOLI|BOX|SHIPMENT|:|#/g, "").trim();
                    }
                  }
                } else {
                  blockCells.forEach(cell => {
                    const val = String(cell).trim().toUpperCase();
                    const fbaMatch = val.match(/FBA[0-9A-Z]{7,}/);
                    if (fbaMatch) {
                      t.currentKoliNo = fbaMatch[0];
                    } else if (val.includes("KOLİ") || val.includes("KOLI") || val.includes("BOX") || val.includes("SHIPMENT")) {
                      const clean = val.replace(/KOLİ|KOLI|BOX|SHIPMENT|:|#/g, "").trim();
                      if (clean.length > 0 && clean.length < 50) {
                        t.currentKoliNo = clean;
                      }
                    }
                  });
                }
              }
            } else {
              // Parse product row
              const asinVal = String(cellValue).trim().toUpperCase();
              const finalKoliNo = t.currentKoliNo || ("EXCEL-" + sheetName.replace(/\s+/g, '_').toUpperCase());
              
              const modelVal = t.modelIdx !== -1 && row[t.modelIdx] ? String(row[t.modelIdx]).trim() : asinVal;
              const qtyVal = t.qtyIdx !== -1 ? parseInt(row[t.qtyIdx], 10) || 1 : 1;
              const soldVal = t.soldIdx !== -1 ? parseInt(row[t.soldIdx], 10) || 0 : 0;
              const buyVal = t.buyIdx !== -1 ? parseFloat(row[t.buyIdx]) || 0 : 0;
              const sellVal = t.sellIdx !== -1 ? parseFloat(row[t.sellIdx]) || 0 : 0;

              parsedProducts.push({
                koliNo: finalKoliNo,
                // Priority: 1) pre-scanned date map, 2) inline t.koliDate, 3) today
                koliDate: koliDateMap[finalKoliNo] || t.koliDate || new Date().toISOString().split('T')[0],
                asin: asinVal,
                modelCode: modelVal,
                quantity: qtyVal,
                receivedQuantity: qtyVal,
                soldCount: soldVal,
                buyPrice: buyVal,
                sellPrice: sellVal
              });
            }
          });
        });
      });

      if (parsedProducts.length === 0) {
        alert("Excel dosyasında geçerli koli veya ASIN verisi bulunamadı!");
        return;
      }

      const shipmentsMap = {};
      const historicalSales = [];

      parsedProducts.forEach(p => {
        if (!shipmentsMap[p.koliNo]) {
          shipmentsMap[p.koliNo] = {
            id: p.koliNo,
            shipDate: p.koliDate,
            arrivalStatus: "Pending",
            products: []
          };
          totalParsedShipments++;
        }

        const existingProd = shipmentsMap[p.koliNo].products.find(prod => prod.asin === p.asin);
        if (existingProd) {
          existingProd.quantity += p.quantity;
          existingProd.receivedQuantity += p.quantity;
        } else {
          shipmentsMap[p.koliNo].products.push({
            asin: p.asin,
            modelCode: p.modelCode,
            quantity: p.quantity,
            receivedQuantity: p.quantity,
            buyPrice: p.buyPrice,
            sellPrice: p.sellPrice
          });
          totalParsedProducts++;
        }

        if (p.soldCount > 0) {
          historicalSales.push({
            orderId: `HIST-${p.koliNo}-${p.asin}`,
            asin: p.asin,
            quantity: p.soldCount,
            purchaseDate: p.koliDate,
            status: "Shipped"
          });
        }
      });

      Object.values(shipmentsMap).forEach(parsedShipment => {
        const idx = state.shipments.findIndex(s => s.id === parsedShipment.id);
        if (idx !== -1) {
          state.shipments[idx] = parsedShipment;
        } else {
          state.shipments.push(parsedShipment);
        }
      });

      const salesResult = addSales(historicalSales);

      saveState();
      renderApp();

      alert(`Excel Arşivi Başarıyla Yüklendi!\n\n` + 
            `• İşlenen Koli Sayısı: ${totalParsedShipments}\n` +
            `• İşlenen Ürün Çeşidi: ${totalParsedProducts}\n` +
            `• Yüklenen Geçmiş Satış Sayısı: ${salesResult.addedCount}\n` +
            `• Güncellenen Satış Sayısı: ${salesResult.updatedCount}\n` +
            `• Es Geçilen Mükerrer Satış: ${salesResult.skippedCount}`);
            
      switchTab("shipments");
      toggleStockView("shipments");
      
    } catch (err) {
      alert("Excel dosyası ayrıştırılamadı. Format hatası!");
      console.error(err);
    }
  };
  reader.readAsArrayBuffer(file);
}

// Excel Export Utility (4 separate sheets: Executive Summary Dashboard, Shipments, Stock Report, Sales Report)
function exportDataToExcel() {
  try {
    if (typeof XLSX === 'undefined') {
      alert("SheetJS kütüphanesi hazır değil. Lütfen sayfayı yenileyip tekrar deneyin.");
      return;
    }

    const inv = recalculateInventory();
    
    if ((!state.shipments || state.shipments.length === 0) && (!state.sales || state.sales.length === 0)) {
      alert("Dışa aktarılacak veri bulunmamaktadır!");
      return;
    }

    const todayStr = new Date().toLocaleDateString('tr-TR');
    const totalSentQty = inv.asinStats.reduce((sum, item) => sum + (item.totalSent || 0), 0);
    const totalSoldQty = (state.sales || []).filter(s => s.status === 'Shipped').reduce((sum, s) => sum + (s.quantity || 0), 0);
    const salesRatePct = totalSentQty > 0 ? Math.round((totalSoldQty / totalSentQty) * 100) : 0;
    const activeRemainingQty = inv.asinStats.reduce((sum, item) => sum + (item.totalRemaining || 0), 0);

    // 1. Executive Summary Sheet Data (AOA)
    const summaryAOA = [
      ["AMAZON FBA STOK VE FİNANSAL YÖNETİM RAPORU", ""],
      ["Rapor Tarihi:", todayStr],
      [""],
      ["=== FİNANSAL VE OPERASYONEL ÖZET ===", "DEĞER"],
      ["Aktif FBA Koli Sayısı", `${state.shipments.length} Koli`],
      ["Toplam Gönderilen Ürün Adedi", `${totalSentQty} Adet`],
      ["Toplam Satılan Ürün Adedi", `${totalSoldQty} Adet`],
      ["Satış Başarı Oranı (%)", `%${salesRatePct}`],
      ["Aktif Kalan Stok Adedi", `${activeRemainingQty} Adet`],
      [""],
      ["Gönderilen Toplam Stok Maliyeti", `${Math.round(inv.financials.totalSentCost).toLocaleString('tr-TR')} TL`],
      ["Aktif Kalan Stok Maliyet Değeri", `${Math.round(inv.financials.activeStockCost).toLocaleString('tr-TR')} TL`],
      ["Gerçekleşen Satış Cirosu (Kasa)", `${Math.round(inv.financials.realizedRevenue).toLocaleString('tr-TR')} TL`],
      ["Gerçekleşen Net Kâr", `${Math.round(inv.financials.realizedNetProfit).toLocaleString('tr-TR')} TL`],
      ["Stoktaki Beklenen Kalan Ciro", `${Math.round(inv.financials.expectedRemainingRevenue).toLocaleString('tr-TR')} TL`],
      ["Stoktaki Beklenen Kalan Kâr", `${Math.round(inv.financials.expectedRemainingProfit).toLocaleString('tr-TR')} TL`],
      [""],
      ["=== STOK YAŞ DAĞILIMI ===", "KUTUDAKİ ADET"],
      ["0 - 30 Günlük Taze Stok", `${inv.stockAgeSummary['0-30'] || 0} Adet`],
      ["31 - 60 Günlük Stok", `${inv.stockAgeSummary['31-60'] || 0} Adet`],
      ["61 - 90 Günlük Stok", `${inv.stockAgeSummary['61-90'] || 0} Adet`],
      ["90+ Günlük Riskli Stok", `${inv.stockAgeSummary['90+'] || 0} Adet`],
      [""],
      ["=== EN ÇOK SATAN ÜRÜNLER (BEST SELLERS) ===", "SATILAN ADET"]
    ];

    (inv.bestSellers || []).slice(0, 10).forEach((b, i) => {
      summaryAOA.push([`${i + 1}. ${b.asin} (${b.modelCode || '-'})`, `${b.totalSold} Adet`]);
    });

    // 2. Prepare Shipments Sheet Data
    const shipmentsData = (inv.shipments || []).map(s => {
      return {
        "Koli No": s.id || "-",
        "Gönderim Tarihi": s.shipDate || "-",
        "Kabul Durumu": s.arrivalStatus === "Pending" ? "Bekliyor" : s.arrivalStatus === "Arrived" ? "Ulaştı" : "Eksik Kabul",
        "Depo Yaşı (Gün)": s.ageInDays || 0,
        "Toplam Ürün (Gönderilen)": s.totalQuantity || 0,
        "Ulaşan/Kabul Edilen": (s.products || []).reduce((sum, p) => sum + (p.receivedQuantity || 0), 0),
        "Satılan Ürün": s.soldQuantity || 0,
        "Kullanılamaz İade": s.returnedQuantity || 0,
        "Kalan Aktif Stok": s.remainingQuantity || 0,
        "Koli Maliyeti (Alış TL)": Math.round(s.totalBuyCost || 0),
        "Elde Edilen Ciro (TL)": Math.round(s.realizedRevenue || 0),
        "Kalan Stok Maliyet Değeri (TL)": Math.round(s.remainingStockCost || 0),
        "Gerçekleşen Kâr (TL)": Math.round(s.realizedProfit || 0)
      };
    });

    // 3. Prepare Product Inventory Sheet Data with Sales Velocity (Satış Hızı)
    const inventoryData = (inv.asinStats || []).map(item => {
      let totalSentBuyValue = 0;
      let totalSentSellValue = 0;
      let totalSentQty = 0;
      let earliestDate = null;
      
      (state.shipments || []).forEach(s => {
        if (!s.products) return;
        const p = s.products.find(prod => prod && prod.asin === item.asin);
        if (p) {
          totalSentBuyValue += (p.quantity || 0) * (p.buyPrice || 0);
          totalSentSellValue += (p.quantity || 0) * (p.sellPrice || 0);
          totalSentQty += (p.quantity || 0);
          if (s.shipDate) {
            const d = new Date(s.shipDate);
            if (!isNaN(d.getTime()) && (!earliestDate || d < earliestDate)) {
              earliestDate = d;
            }
          }
        }
      });

      const avgBuyPrice = totalSentQty > 0 ? (totalSentBuyValue / totalSentQty) : 0;
      const avgSellPrice = totalSentQty > 0 ? (totalSentSellValue / totalSentQty) : 0;
      const remainingCost = (item.totalRemaining || 0) * avgBuyPrice;
      const expectedRevenue = (item.totalRemaining || 0) * avgSellPrice;
      const expectedProfit = expectedRevenue - remainingCost;

      const daysActive = earliestDate ? Math.max(1, Math.floor((new Date() - earliestDate) / (1000 * 60 * 60 * 24))) : 30;
      const dailyVelocity = Math.round(((item.totalSold || 0) / daysActive) * 100) / 100;
      const daysOfSupply = dailyVelocity > 0 ? `${Math.round((item.totalRemaining || 0) / dailyVelocity)} Gün` : 'Stok Hareketsiz';

      return {
        "ASIN": item.asin || "-",
        "Model Kodu": item.modelCode || "-",
        "Toplam Gönderilen": item.totalSent || 0,
        "Toplam Satılan": item.totalSold || 0,
        "Hasarlı İade": item.totalReturnedUnsellable || 0,
        "Aktif Kalan Stok": item.totalRemaining || 0,
        "Günlük Satış Hızı (Adet/Gün)": dailyVelocity,
        "Tahmini Stok Dayanma Süresi": daysOfSupply,
        "Birim Alış (Ortalama TL)": Math.round(avgBuyPrice * 100) / 100,
        "Birim Satış (Ortalama TL)": Math.round(avgSellPrice * 100) / 100,
        "Kalan Stok Maliyeti (TL)": Math.round(remainingCost * 100) / 100,
        "Beklenen Kalan Ciro (TL)": Math.round(expectedRevenue * 100) / 100,
        "Beklenen Kalan Kâr (TL)": Math.round(expectedProfit * 100) / 100
      };
    });

    // 4. Prepare Sales Sheet Data
    const salesData = (state.sales || []).map(sale => {
      const match = (inv.asinStats || []).find(a => a.asin === sale.asin);
      const modelCode = match ? match.modelCode : "-";
      
      let buyPrice = 0;
      let sellPrice = 0;
      for (let s of (state.shipments || [])) {
        if (!s.products) continue;
        const p = s.products.find(prod => prod && prod.asin === sale.asin);
        if (p) {
          buyPrice = p.buyPrice || 0;
          sellPrice = p.sellPrice || 0;
          break;
        }
      }

      let returnStatus = "-";
      if (sale.status === 'Returned' && sale.returnDetail) {
        returnStatus = sale.returnDetail.isConfirmedInStock ? "Stoka Girdi (Sellable)" : `Hasarlı - Refund: ${sale.returnDetail.reimbursement || 'Pending'}`;
      } else if (sale.status === 'RemovalReceived') {
        returnStatus = "Amazon Lojistik Geri Çekme (Tamamlandı)";
      }

      return {
        "Sipariş ID": sale.orderId || "-",
        "ASIN": sale.asin || "-",
        "Model Kodu": modelCode,
        "Satış Tarihi": sale.purchaseDate || "-",
        "Satılan Adet": sale.quantity || 1,
        "Sipariş Durumu": sale.status === 'RemovalReceived' ? "Lojistik İadesi (Geri Çekme)" : (sale.status || 'Shipped'),
        "Alış Fiyatı (Birim TL)": buyPrice,
        "Satış Fiyatı (Birim TL)": sale.sellPrice || sellPrice,
        "Müşteri E-Posta": sale.email || "-",
        "İade / Geri Çekme Detayı": returnStatus
      };
    });

    const createWb = (XLSX.utils && XLSX.utils.book_new) ? XLSX.utils.book_new : (XLSX.book_new || (() => ({ SheetNames: [], Sheets: {} })));
    const appendSheet = (XLSX.utils && XLSX.utils.book_append_sheet) ? XLSX.utils.book_append_sheet : (XLSX.book_append_sheet || ((b, s, n) => { b.SheetNames.push(n); b.Sheets[n] = s; }));

    const wb = createWb();

    const wsSummary = XLSX.utils.aoa_to_sheet(summaryAOA);
    const wsShipments = XLSX.utils.json_to_sheet(shipmentsData);
    const wsInventory = XLSX.utils.json_to_sheet(inventoryData);
    const wsSales = XLSX.utils.json_to_sheet(salesData);

    // Auto-fit column widths for clear reading
    const setColWidths = (ws, data) => {
      if (!data || data.length === 0) return;
      const colWidths = [];
      data.forEach(row => {
        const keys = Array.isArray(row) ? row : Object.keys(row);
        keys.forEach((k, colIdx) => {
          const val = Array.isArray(row) ? String(row[colIdx] || '') : String(row[k] || '');
          const len = Math.max(String(k).length, val.length);
          colWidths[colIdx] = Math.max(colWidths[colIdx] || 12, len + 5);
        });
      });
      ws['!cols'] = colWidths.map(w => ({ wch: Math.min(w, 50) }));
    };

    setColWidths(wsSummary, summaryAOA);
    setColWidths(wsShipments, shipmentsData);
    setColWidths(wsInventory, inventoryData);
    setColWidths(wsSales, salesData);

    appendSheet(wb, wsSummary, "📊 GENEL FİNANSAL ÖZET");
    appendSheet(wb, wsShipments, "📦 KOLİ DETAYLARI");
    appendSheet(wb, wsInventory, "🏷️ ÜRÜN STOK RAPORU");
    appendSheet(wb, wsSales, "🛒 SATIŞ DETAYLARI");

    const fileName = `Amazon_FBA_Detayli_Rapor_${new Date().toISOString().split('T')[0]}.xlsx`;

    try {
      // Primary: Native Uint8Array Blob download (works cross-browser without security popups)
      const u8 = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([u8], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        if (document.body.contains(a)) document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 300);
    } catch (e1) {
      console.warn("Direct Blob export failed, using XLSX.writeFile fallback:", e1);
      XLSX.writeFile(wb, fileName);
    }
  } catch (err) {
    console.error("Excel Raporu Oluşturma Hatası:", err);
    alert("Excel raporu indirilirken bir hata oluştu: " + err.message);
  }
}

// Open Bulk Date Edit Modal and populate it
function openBulkDateModal() {
  const tbody = document.getElementById("bulk-date-table-body");
  tbody.innerHTML = "";

  if (state.shipments.length === 0) {
    alert("Tarihleri düzenlenecek koli bulunmamaktadır. Lütfen önce koli ekleyin.");
    return;
  }

  // Sort shipments alphabetically by shipment code
  const sortedShipments = [...state.shipments].sort((a, b) => a.id.localeCompare(b.id));

  sortedShipments.forEach(s => {
    tbody.innerHTML += `
      <tr>
        <td><strong>${s.id}</strong></td>
        <td>
          <input type="date" class="bulk-date-input" data-shipment-id="${s.id}" value="${s.shipDate}" style="background: rgba(0,0,0,0.3); border: 1px solid var(--glass-border); padding: 6px 12px; border-radius: 8px; color: #fff; width:100%; outline:none; font-family:inherit;">
        </td>
      </tr>
    `;
  });

  openModal("bulk-date-modal");
}

// Save bulk edited dates
function handleBulkDateSubmit(e) {
  e.preventDefault();
  const inputs = document.querySelectorAll(".bulk-date-input");
  
  inputs.forEach(input => {
    const shipmentId = input.getAttribute("data-shipment-id");
    const newDate = input.value;
    
    const shipment = state.shipments.find(s => s.id === shipmentId);
    if (shipment && newDate) {
      shipment.shipDate = newDate;
    }
  });

  saveState();
  renderApp();
  closeModal("bulk-date-modal");
  alert("Tüm koli tarihleri toplu olarak başarıyla güncellendi!");
}

// Chart drawing
function drawStockAgeChart(summary) {
  const ctx = document.getElementById('stockAgeChart');
  if (!ctx) return;

  if (typeof Chart === 'undefined') {
    console.warn("Chart.js is not loaded. Skipping chart rendering.");
    return;
  }

  if (stockChartInstance) {
    stockChartInstance.destroy();
  }

  const dataValues = [summary['0-30'], summary['31-60'], summary['61-90'], summary['90+']];
  const allZero = dataValues.every(v => v === 0);
  
  const legendContainer = document.getElementById("stock-age-legend");
  legendContainer.innerHTML = `
    <div class="legend-item">
      <div class="legend-color-label">
        <span class="legend-dot" style="background-color: #10b981;"></span>
        <span>0-30 Gün (Yeni)</span>
      </div>
      <span class="quick-stat-val">${summary['0-30']} adet</span>
    </div>
    <div class="legend-item">
      <div class="legend-color-label">
        <span class="legend-dot" style="background-color: #3b82f6;"></span>
        <span>31-60 Gün (Orta)</span>
      </div>
      <span class="quick-stat-val">${summary['31-60']} adet</span>
    </div>
    <div class="legend-item">
      <div class="legend-color-label">
        <span class="legend-dot" style="background-color: #f59e0b;"></span>
        <span>61-90 Gün (Eski)</span>
      </div>
      <span class="quick-stat-val">${summary['61-90']} adet</span>
    </div>
    <div class="legend-item">
      <div class="legend-color-label">
        <span class="legend-dot" style="background-color: #ef4444;"></span>
        <span>90+ Gün (Kritik)</span>
      </div>
      <span class="quick-stat-val text-red">${summary['90+']} adet</span>
    </div>
  `;

  if (allZero) {
    stockChartInstance = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Stok Yok'],
        datasets: [{
          data: [1],
          backgroundColor: ['rgba(255, 255, 255, 0.05)'],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        cutout: '70%'
      }
    });
    return;
  }

  stockChartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['0-30 Gün', '31-60 Gün', '61-90 Gün', '90+ Gün'],
      datasets: [{
        data: dataValues,
        backgroundColor: ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'],
        borderColor: 'rgba(15, 21, 36, 0.8)',
        borderWidth: 2,
        hoverOffset: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        }
      },
      cutout: '70%'
    }
  });
}

// UI Event Bindings
function setupEventListeners() {
  document.querySelectorAll(".menu-item").forEach(item => {
    item.addEventListener("click", (e) => {
      e.preventDefault();
      const tabId = item.getAttribute("data-tab");
      switchTab(tabId);
    });
  });

  document.querySelectorAll(".modal-backdrop").forEach(backdrop => {
    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) {
        closeModal(backdrop.id);
      }
    });
  });

  const dropZone = document.getElementById("csv-drop-zone");
  const fileInput = document.getElementById("csv-file-input");

  if (dropZone && fileInput) {
    dropZone.addEventListener("click", () => fileInput.click());

    dropZone.addEventListener("dragover", (e) => {
      e.preventDefault();
      dropZone.classList.add("hover");
    });

    ["dragleave", "drop"].forEach(eventName => {
      dropZone.addEventListener(eventName, () => dropZone.classList.remove("hover"));
    });

    dropZone.addEventListener("drop", (e) => {
      e.preventDefault();
      const dt = e.dataTransfer;
      const files = dt.files;
      if (files.length) {
        handleFileSelect(files[0]);
      }
    });

    fileInput.addEventListener("change", (e) => {
      if (fileInput.files.length) {
        handleFileSelect(fileInput.files[0]);
      }
    });
  }
}

// Switch tabs programmatic
function switchTab(tabId) {
  document.querySelectorAll(".menu-item").forEach(el => el.classList.remove("active"));
  document.querySelectorAll(".tab-content").forEach(el => el.classList.remove("active"));

  const menuItem = document.querySelector(`.menu-item[data-tab="${tabId}"]`);
  if (menuItem) menuItem.classList.add("active");

  const tabContent = document.getElementById(`tab-${tabId}`);
  if (tabContent) tabContent.classList.add("active");

  const pageTitle = document.getElementById("page-title");
  const pageSubtitle = document.getElementById("page-subtitle");
  
  if (tabId === "dashboard") {
    if (pageTitle) pageTitle.textContent = "Genel Bakış";
    if (pageSubtitle) pageSubtitle.textContent = "Amazon FBA envanter ve satış analizi";
  } else if (tabId === "shipments") {
    if (pageTitle) pageTitle.textContent = "Koliler & Stok";
    if (pageSubtitle) pageSubtitle.textContent = "Gönderilen koliler ve anlık stok durumları";
  } else if (tabId === "import") {
    if (pageTitle) pageTitle.textContent = "Satış Yükle";
    if (pageSubtitle) pageSubtitle.textContent = "Amazon siparişlerini içeri aktarma paneli";
  } else if (tabId === "returns") {
    if (pageTitle) pageTitle.textContent = "İadeler & Refund";
    if (pageSubtitle) pageSubtitle.textContent = "Hasarlı iadeler ve Amazon geri ödeme süreçleri";
  } else if (tabId === "customers") {
    if (pageTitle) pageTitle.textContent = "Müşteri Mailleri";
    if (pageSubtitle) pageSubtitle.textContent = "Amazon siparişlerinden ayrıştırılan e-posta listesi";
    renderCustomerEmails();
  } else if (tabId === "settings") {
    if (pageTitle) pageTitle.textContent = "Ayarlar & Yedek";
    if (pageSubtitle) pageSubtitle.textContent = "Veri yönetimi ve sistem ayarları";
  }
}

// Modal management
function openModal(modalId) {
  document.getElementById(modalId).classList.add("active");
}

// Submit new shipment with price support
function handleShipmentSubmit(e) {
  e.preventDefault();
  const id = document.getElementById("shipment-id-input").value;
  const shipDate = document.getElementById("shipment-date-input").value;
  const rawProducts = document.getElementById("shipment-products-raw").value;

  const lines = rawProducts.split("\n").map(l => l.trim()).filter(l => l.length > 0);
  const products = [];

  lines.forEach((line) => {
    const parts = line.split(/[\t,;]|\s{2,}/).map(t => t.trim()).filter(t => t.length > 0);
    const tokens = parts.length >= 2 ? parts : line.split(/\s+/).map(t => t.trim()).filter(t => t.length > 0);

    if (tokens.length >= 2) {
      let asin = tokens[0];
      let modelCode = tokens[0];
      let quantity = 1;
      let buyPrice = 0;
      let sellPrice = 0;

      if (tokens.length === 2 && !isNaN(tokens[1])) {
        quantity = parseInt(tokens[1], 10) || 1;
      }
      else if (tokens.length === 3) {
        modelCode = tokens[1];
        quantity = parseInt(tokens[2], 10) || 1;
      }
      else if (tokens.length >= 4) {
        modelCode = tokens[1];
        quantity = parseInt(tokens[2], 10) || 1;
        buyPrice = parseFloat(tokens[3]) || 0;
        sellPrice = parseFloat(tokens[4]) || 0;
      }

      if (/^[0-9A-Z]{10}$/i.test(asin)) {
        products.push({
          asin: asin,
          modelCode: modelCode || asin,
          quantity: quantity,
          buyPrice: buyPrice,
          sellPrice: sellPrice
        });
      }
    }
  });

  if (products.length === 0) {
    alert("Geçerli bir ürün listesi ayrıştırılamadı! Lütfen formatı kontrol edin (ASIN [Boşluk] Model [Boşluk] Adet [Boşluk] Alış [Boşluk] Satış).");
    return;
  }

  const success = addShipment(id, shipDate, products);
  if (success) {
    closeModal("new-shipment-modal");
    document.getElementById("new-shipment-form").reset();
    document.getElementById("shipment-date-input").value = new Date().toISOString().split('T')[0];
  }
}

function closeModal(modalId) {
  document.getElementById(modalId).classList.remove("active");
}

function toggleShipmentDetails(shipmentId) {
  if (!state.expandedShipments) state.expandedShipments = {};
  state.expandedShipments[shipmentId] = !state.expandedShipments[shipmentId];
  renderApp();
}

function setBoxStatusFilter(filterMode) {
  state.boxStatusFilter = filterMode;
  renderApp();
}

function setShipmentSubTab(shipmentId, tabName) {
  if (!state.shipmentSubTabs) state.shipmentSubTabs = {};
  state.shipmentSubTabs[shipmentId] = tabName;
  if (!state.expandedShipments) state.expandedShipments = {};
  state.expandedShipments[shipmentId] = true;
  renderApp();
}

// Toggle showing all best sellers vs top 5
function toggleAllBestSellers() {
  window._showAllBestSellers = !window._showAllBestSellers;
  renderApp();
}

function focusShipment(shipmentId) {
  switchTab('shipments');
  state.boxStatusFilter = 'all';
  if (!state.expandedShipments) state.expandedShipments = {};
  state.expandedShipments[shipmentId] = true;
  toggleStockView('shipments'); 
  renderApp();
  setTimeout(() => {
    const card = document.getElementById(`shipment-card-${shipmentId}`);
    if (card) {
      card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      card.style.borderColor = 'var(--primary)';
      card.style.boxShadow = '0 0 20px rgba(99, 102, 241, 0.4)';
      setTimeout(() => {
        card.style.borderColor = '';
        card.style.boxShadow = '';
      }, 2500);
    }
  }, 150);
}

// File select and parse
function handleFileSelect(file) {
  const reader = new FileReader();
  reader.onload = function(e) {
    const text = e.target.result;
    document.getElementById("paste-text-input").value = text;
    handlePasteParse();
  };
  reader.readAsText(file);
}

function clearPasteArea() {
  document.getElementById("paste-text-input").value = "";
  document.getElementById("import-preview-card").style.display = "none";
  parsedSalesPendingImport = null;
}

function handlePasteParse() {
  const text = document.getElementById("paste-text-input").value;
  if (!text.trim()) {
    alert("Lütfen kopyaladığınız sipariş verilerini metin kutusuna yapıştırın.");
    return;
  }

  const parsed = parseTextData(text);
  if (parsed.data.length === 0) {
    alert("Veriler ayrıştırılamadı. ASIN (B0 ile başlayan 10 haneli kod) ve adet kolonlarının bulunduğundan emin olun.");
    return;
  }

  parsedSalesPendingImport = parsed.data;

  document.getElementById("import-preview-card").style.display = "block";
  document.getElementById("preview-count-badge").textContent = `${parsed.data.length} Sipariş Satırı Ayrıştırıldı`;
  
  const mappingList = document.getElementById("mapping-list");
  mappingList.innerHTML = `
    <li><strong>Sipariş No/Tipi:</strong> ${parsed.matchedColumns.orderId || "Bulunamadı"}</li>
    <li><strong>ASIN Kolonu:</strong> ${parsed.matchedColumns.asin || "Bulunamadı"}</li>
    <li><strong>Miktar Kolonu:</strong> ${parsed.matchedColumns.quantity || "Bulunamadı"}</li>
    <li><strong>Tarih Kolonu:</strong> ${parsed.matchedColumns.purchaseDate || "Bulunamadı"}</li>
    <li><strong>Satış Fiyatı:</strong> ${parsed.matchedColumns.sellPrice || "Bulunamadı"}</li>
    <li><strong>Müşteri E-Posta:</strong> Otomatik Yakalama Etkin</li>
    <li><strong>Durum Kolonu:</strong> ${parsed.matchedColumns.status || "Bulunamadı"}</li>
  `;

  const tableHeader = document.getElementById("preview-table-header");
  tableHeader.innerHTML = `
    <th>Sipariş ID</th>
    <th>ASIN</th>
    <th>Miktar</th>
    <th>Tarih</th>
    <th>Satış Fiyatı</th>
    <th>Müşteri E-Posta</th>
    <th>Durum</th>
  `;

  const tableBody = document.getElementById("preview-table-body");
  tableBody.innerHTML = "";
  
  parsed.data.slice(0, 8).forEach(row => {
    tableBody.innerHTML += `
      <tr>
        <td>${row.orderId}</td>
        <td><strong>${row.asin}</strong></td>
        <td>${row.quantity}</td>
        <td>${row.purchaseDate}</td>
        <td>${row.sellPrice ? row.sellPrice + ' TL' : '-'}</td>
        <td>${row.email ? '<span class="text-blue">' + row.email + '</span>' : '-'}</td>
        <td><span class="badge ${row.status === 'Returned' ? 'badge-danger' : row.status === 'Pending' ? 'badge-warning' : row.status === 'RemovalReceived' ? 'badge-info' : 'badge-success'}">${row.status === 'RemovalReceived' ? 'Removal' : row.status}</span></td>
      </tr>
    `;
  });

  if (parsed.data.length > 8) {
    tableBody.innerHTML += `
      <tr>
        <td colspan="7" style="text-align: center; color: var(--text-muted); font-style: italic;">
          ...ve ${parsed.data.length - 8} satır daha
        </td>
      </tr>
    `;
  }
}

function cancelImport() {
  document.getElementById("import-preview-card").style.display = "none";
  parsedSalesPendingImport = null;
}

// Convert parsed sales
function confirmImport() {
  if (!parsedSalesPendingImport || parsedSalesPendingImport.length === 0) return;

  const result = addSales(parsedSalesPendingImport);
  alert(`İşlem Tamamlandı!\n\n• ${result.addedCount} yeni sipariş/lojistik iadesi sisteme eklendi.\n• ${result.updatedCount} mevcut siparişte durum/fiyat/eposta güncellemesi yapıldı.\n• ${result.skippedCount} mükerrer sipariş es geçildi.`);
  
  clearPasteArea();
  switchTab("dashboard");
}

// Return Modal logic
function openUpdateReturnModal(orderId, asin, condition, reimbursement, reimbursementId, reimbursementAmount, isConfirmed) {
  document.getElementById("return-update-order-id").value = orderId;
  document.getElementById("return-update-asin").value = asin;
  
  document.getElementById("return-confirm-stock").checked = isConfirmed;
  
  document.getElementById("return-condition").value = condition || "Defective";
  document.getElementById("return-reimbursement").value = reimbursement || "Pending";
  document.getElementById("return-reimbursement-id").value = reimbursementId || "";
  document.getElementById("return-reimbursement-amount").value = reimbursementAmount || 0;
  
  handleReturnConfirmStockChange(); 
  openModal("update-return-modal");
}

// JSON Backup Utilities
function exportDataJSON() {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", `FBA_Stock_Tracker_Backup_${new Date().toISOString().split('T')[0]}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

function importDataJSON(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(evt) {
    try {
      const importedState = JSON.parse(evt.target.result);
      if (importedState && Array.isArray(importedState.shipments) && Array.isArray(importedState.sales)) {
        if (confirm("Bu dosyayı yüklemek mevcut tüm verilerinizi ezecektir. Devam etmek istiyor musunuz?")) {
          state = importedState;
          saveState();
          renderApp();
          alert("Yedek dosyası başarıyla yüklendi!");
        }
      } else {
        alert("Geçersiz yedek dosyası formatı. Dosyanın geçerli bir yedek olduğundan emin olun.");
      }
    } catch (err) {
      alert("Dosya okuma veya JSON ayrıştırma hatası.");
      console.error(err);
    }
  };
  reader.readAsText(file);
}

function confirmResetAll() {
  if (confirm("Tüm verilerinizi (koliler ve sipariş geçmişi) silmek istediğinize emin misiniz? Bu işlem geri alınamaz.")) {
    clearAllData();
    alert("Tüm veriler sıfırlandı.");
  }
}

function handleReturnConfirmStockChange() {
  const isStockConfirmed = document.getElementById("return-confirm-stock").checked;
  const unsellableOptions = document.getElementById("return-unsellable-options");
  if (isStockConfirmed) {
    unsellableOptions.style.display = "none";
  } else {
    unsellableOptions.style.display = "block";
    toggleReimbursementFields();
  }
}

function toggleReimbursementFields() {
  const status = document.getElementById("return-reimbursement").value;
  const amountGroup = document.getElementById("reimbursement-amount-group");
  const idGroup = document.getElementById("reimbursement-id-group");
  
  if (status === "Reimbursed") {
    amountGroup.style.display = "block";
    idGroup.style.display = "block";
  } else if (status === "RemovalRequested" || status === "RemovalReceived") {
    amountGroup.style.display = "none";
    idGroup.style.display = "block"; 
  } else {
    amountGroup.style.display = "none";
    idGroup.style.display = "none";
  }
}

function handleReturnUpdateSubmit(e) {
  e.preventDefault();
  const orderId = document.getElementById("return-update-order-id").value;
  const asin = document.getElementById("return-update-asin").value;
  
  const isConfirmed = document.getElementById("return-confirm-stock").checked;
  const condition = document.getElementById("return-condition").value;
  const reimbursement = document.getElementById("return-reimbursement").value;
  const reimbursementAmount = document.getElementById("return-reimbursement-amount").value;
  const reimbursementId = document.getElementById("return-reimbursement-id").value;

  updateReturnDetail(orderId, asin, isConfirmed, condition, reimbursement, reimbursementAmount, reimbursementId);
  closeModal("update-return-modal");
}

// --- EXECUTIVE VISUAL REPORT MODAL ---
let execFinancialChart = null;
let execAgeChart = null;
let execBestsellersChart = null;
let execStatusChart = null;

function openExecutiveReportModal() {
  const inv = recalculateInventory();
  
  const todayStr = new Date().toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric' });
  const dateSub = document.getElementById("exec-report-date-sub");
  if (dateSub) dateSub.textContent = `Oluşturulma Tarihi: ${todayStr}`;

  const formatCurrency = (val) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(val);

  document.getElementById("exec-realized-rev").textContent = formatCurrency(inv.financials.realizedRevenue);
  document.getElementById("exec-net-profit").textContent = formatCurrency(inv.financials.realizedNetProfit);
  document.getElementById("exec-exp-rev").textContent = formatCurrency(inv.financials.expectedRemainingRevenue);

  const totalSentQty = inv.asinStats.reduce((sum, item) => sum + (item.totalSent || 0), 0);
  const totalSoldQty = (state.sales || []).filter(s => s.status === 'Shipped').reduce((sum, s) => sum + (s.quantity || 0), 0);
  const salesRatePct = totalSentQty > 0 ? Math.round((totalSoldQty / totalSentQty) * 100) : 0;

  document.getElementById("exec-sales-rate").textContent = `%${salesRatePct}`;

  // Calculate Overall Daily Velocity for Executive Modal
  let totalDailyVel = 0;
  inv.asinStats.forEach(item => {
    let earliestDate = null;
    state.shipments.forEach(s => {
      if (s.products && s.products.some(p => p.asin === item.asin) && s.shipDate) {
        const d = new Date(s.shipDate);
        if (!isNaN(d.getTime()) && (!earliestDate || d < earliestDate)) earliestDate = d;
      }
    });
    const daysActive = earliestDate ? Math.max(1, Math.floor((new Date() - earliestDate) / (1000 * 60 * 60 * 24))) : 30;
    totalDailyVel += (item.totalSold / daysActive);
  });
  const avgDailyVel = Math.round(totalDailyVel * 10) / 10;
  const execVelEl = document.getElementById("exec-velocity");
  if (execVelEl) execVelEl.textContent = `${avgDailyVel} Adet/Gün`;

  // Populate Bestsellers Summary Table
  const tbody = document.getElementById("exec-bestsellers-table-body");
  if (tbody) {
    tbody.innerHTML = "";
    (inv.bestSellers || []).slice(0, 5).forEach((b, i) => {
      let earliestDate = null;
      state.shipments.forEach(s => {
        if (s.products && s.products.some(p => p.asin === b.asin) && s.shipDate) {
          const d = new Date(s.shipDate);
          if (!isNaN(d.getTime()) && (!earliestDate || d < earliestDate)) earliestDate = d;
        }
      });
      const daysActive = earliestDate ? Math.max(1, Math.floor((new Date() - earliestDate) / (1000 * 60 * 60 * 24))) : 30;
      const prodVel = Math.round((b.totalSold / daysActive) * 100) / 100;

      tbody.innerHTML += `
        <tr>
          <td><strong>#${i + 1}</strong></td>
          <td><strong>${b.asin}</strong></td>
          <td>${b.modelCode || '-'}</td>
          <td><span class="text-green">${b.totalSold} adet</span></td>
          <td>${b.totalRemaining} adet</td>
        </tr>
      `;
    });
  }

  // Open Modal
  openModal('executive-report-modal');

  // Render Charts with Chart.js
  setTimeout(() => {
    // 1. Financial Performance Bar Chart
    if (execFinancialChart) execFinancialChart.destroy();
    const ctx1 = document.getElementById('chart-exec-financials');
    if (ctx1) {
      execFinancialChart = new Chart(ctx1.getContext('2d'), {
        type: 'bar',
        data: {
          labels: ['Gönderi Maliyeti', 'Elde Edilen Ciro', 'Net Kâr', 'Beklenen Ciro'],
          datasets: [{
            data: [
              inv.financials.totalSentCost,
              inv.financials.realizedRevenue,
              inv.financials.realizedNetProfit,
              inv.financials.expectedRemainingRevenue
            ],
            backgroundColor: ['#f97316', '#3b82f6', '#22c55e', '#38bdf8'],
            borderRadius: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { ticks: { color: '#94a3b8', font: { size: 10 } }, grid: { display: false } },
            y: { ticks: { color: '#94a3b8', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.05)' } }
          }
        }
      });
    }

    // 2. Stock Age Doughnut Chart
    if (execAgeChart) execAgeChart.destroy();
    const ctx2 = document.getElementById('chart-exec-stock-age');
    if (ctx2) {
      execAgeChart = new Chart(ctx2.getContext('2d'), {
        type: 'doughnut',
        data: {
          labels: ['0-30 Gün', '31-60 Gün', '61-90 Gün', '90+ Gün'],
          datasets: [{
            data: [
              inv.stockAgeSummary['0-30'] || 0,
              inv.stockAgeSummary['31-60'] || 0,
              inv.stockAgeSummary['61-90'] || 0,
              inv.stockAgeSummary['90+'] || 0
            ],
            backgroundColor: ['#22c55e', '#eab308', '#f97316', '#ef4444'],
            borderWidth: 0
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { position: 'right', labels: { color: '#94a3b8', font: { size: 10 } } } }
        }
      });
    }

    // 3. Top 5 Bestsellers Horizontal Bar
    if (execBestsellersChart) execBestsellersChart.destroy();
    const top5 = (inv.bestSellers || []).slice(0, 5);
    const ctx3 = document.getElementById('chart-exec-bestsellers');
    if (ctx3) {
      execBestsellersChart = new Chart(ctx3.getContext('2d'), {
        type: 'bar',
        data: {
          labels: top5.map(b => b.modelCode || b.asin),
          datasets: [{
            data: top5.map(b => b.totalSold),
            backgroundColor: '#a855f7',
            borderRadius: 6
          }]
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { ticks: { color: '#94a3b8', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.05)' } },
            y: { ticks: { color: '#94a3b8', font: { size: 10 } }, grid: { display: false } }
          }
        }
      });
    }

    // 4. Shipment Status Pie Chart
    if (execStatusChart) execStatusChart.destroy();
    const arrived = (state.shipments || []).filter(s => s.arrivalStatus === 'Arrived').length;
    const pending = (state.shipments || []).filter(s => s.arrivalStatus === 'Pending').length;
    const ctx4 = document.getElementById('chart-exec-shipment-status');
    if (ctx4) {
      execStatusChart = new Chart(ctx4.getContext('2d'), {
        type: 'pie',
        data: {
          labels: ['Ulaşan / Kabul Edilen', 'Depoya Ulaşması Bekleyen'],
          datasets: [{
            data: [arrived, pending],
            backgroundColor: ['#3b82f6', '#f59e0b'],
            borderWidth: 0
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { position: 'bottom', labels: { color: '#94a3b8', font: { size: 10 } } } }
        }
      });
    }
  }, 150);
}

// Bootstrapping
document.addEventListener("DOMContentLoaded", () => {
  initApp();
});

// Explicit global window bindings for inline HTML handlers
window.switchTab = switchTab;
window.focusShipment = focusShipment;
window.setBoxStatusFilter = setBoxStatusFilter;
window.setShipmentSubTab = setShipmentSubTab;
window.toggleShipmentDetails = toggleShipmentDetails;
window.toggleStockView = toggleStockView;

console.log("Amazon FBA Tracker v2.1 loaded.");
