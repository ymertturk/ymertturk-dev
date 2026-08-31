const MOCK_SHIPMENTS = [
  {
    id: "FBA15M03QDK3",
    shipDate: "2026-06-01",
    products: [
      { asin: "B0DWV5H5VJ", modelCode: "AE-1600H-5AVDF", quantity: 4, buyPrice: 200, sellPrice: 450 },
      { asin: "B0CNT7PLYD", modelCode: "A168WA-5AYDF", quantity: 1, buyPrice: 250, sellPrice: 550 },
      { asin: "B000J34HN4", modelCode: "F-91W-1DG", quantity: 2, buyPrice: 80, sellPrice: 220 },
      { asin: "B07GBTB1SJ", modelCode: "W-218H-4BVDF", quantity: 1, buyPrice: 150, sellPrice: 350 },
      { asin: "B00XP64WI2", modelCode: "MQ-71-1BDF", quantity: 1, buyPrice: 120, sellPrice: 290 },
      { asin: "B08DJ1YZPD", modelCode: "LTP-V007L-7B1UDF", quantity: 1, buyPrice: 180, sellPrice: 400 },
      { asin: "B002J4UBJ0", modelCode: "F-201WA-1ADF", quantity: 1, buyPrice: 110, sellPrice: 260 }
    ]
  },
  {
    id: "FBA15M05XYZ4",
    shipDate: "2026-07-10",
    products: [
      { asin: "B000J34HN4", modelCode: "F-91W-1DG", quantity: 5, buyPrice: 80, sellPrice: 220 },
      { asin: "B08DJ1YZPD", modelCode: "LTP-V007L-7B1UDF", quantity: 3, buyPrice: 180, sellPrice: 400 },
      { asin: "B002J4UBJ0", modelCode: "F-201WA-1ADF", quantity: 2, buyPrice: 110, sellPrice: 260 },
      { asin: "B0DWV5H5VJ", modelCode: "AE-1600H-5AVDF", quantity: 2, buyPrice: 200, sellPrice: 430 } // price changed slightly
    ]
  }
];

const MOCK_SALES = [
  {
    orderId: "114-1234567-1234567",
    asin: "B0DWV5H5VJ",
    quantity: 2,
    purchaseDate: "2026-06-15",
    status: "Shipped"
  },
  {
    orderId: "114-1234567-7654321",
    asin: "B000J34HN4",
    quantity: 1,
    purchaseDate: "2026-06-20",
    status: "Shipped"
  },
  {
    orderId: "114-9999999-1111111",
    asin: "B000J34HN4",
    quantity: 2,
    purchaseDate: "2026-07-18",
    status: "Shipped"
  },
  {
    orderId: "114-8888888-2222222",
    asin: "B0CNT7PLYD",
    quantity: 1,
    purchaseDate: "2026-07-20",
    status: "Returned",
    returnDetail: {
      condition: "Defective",
      disposition: "Customer Damaged",
      isConfirmedInStock: false,
      reimbursement: "Pending", // Pending, Reimbursed, None, RemovalRequested
      reimbursementAmount: 0,
      reimbursementId: ""
    }
  }
];

// Export standard mock state
window.INITIAL_MOCK_DATA = {
  shipments: MOCK_SHIPMENTS,
  sales: MOCK_SALES
};
