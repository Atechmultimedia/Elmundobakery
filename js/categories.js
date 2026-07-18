/* ============================================================
   Category drop-lists — taken directly from the
   "Drop lists category" sheet of the management workbook.
   ============================================================ */

const ASSET_CATEGORIES = {
  "Building": ["Land", "Factory Building", "Shop Premises", "Building Improvements", "Renovations", "Security Gates"],
  "Production Equipment": ["Oven", "Dough Mixer", "Dough Divider", "Dough Sheeter", "Dough Rounder", "Dough Moulder", "Proofer", "Industrial Scale"],
  "Bakery Tools": ["Bread Tins", "Loaf Pans", "Baguette Trays", "Croissant Trays", "Cooling Racks", "Proofing Baskets", "Dough Scrapers", "Thermometers"],
  "Refrigeration": ["Freezer", "Display Fridge", "Beverage Fridge", "Cold Room"],
  "Furniture & Fixtures": ["Operation Table", "Packaging Table", "Display Counter", "Storage Rack", "Office Desk", "Chair"],
  "Vehicles": ["Delivery Tricycle", "Delivery Van", "Motorbike", "Push Cart"],
  "IT Equipment": ["Laptop", "Desktop Computer", "Tablet", "POS System", "Receipt Printer", "CCTV"],
  "Power Equipment": ["Generator", "Solar System", "Inverter", "Voltage Stabiliser"],
  "Other": ["Other"]
};

const EXPENSE_CATEGORY_MAP = {
  "Ingredients": ["Flour", "Sugar", "Salt", "Yeast", "Butter", "Margarine", "Oil", "Eggs", "Milk", "Chocolate", "Cocoa Powder", "Vanilla", "Almond Flour", "Pistachio Paste", "Mango", "Pineapple", "Ginger", "Pectin", "Citric Acid", "Spices", "Other"],
  "Packaging": ["Bread Bags", "Stickers", "Labels", "Cake Boxes", "Croissant Boxes", "Jam Jars", "Wax Paper", "Tissue Paper", "Other"],
  "Production": ["Mixed Supplies", "Other"],
  "Equipment": ["Tools", "Small Equipment", "Other"],
  "Salaries": ["Baker", "Assistant Baker", "Sales Assistant", "Driver", "Cleaner", "Casual Labour", "Bonus", "Overtime", "Advance"],
  "Utilities": ["Electricity", "Water", "Internet", "Telephone", "Waste Collection"],
  "Fuel & Energy": ["LPG / Cooking Gas", "Cylinder Refill", "Electricity (Bakery)", "Generator Diesel", "Generator Petrol", "Generator Servicing", "Charcoal", "Firewood", "Gas Cylinder Purchase", "Regulator / Hose", "Other"],
  "Logistics": ["Fuel", "Delivery Cost", "Vehicle Repairs", "Tricycle Repairs", "Parking", "Toll", "Vehicle Insurance", "Vehicle Licensing", "Roadworthy", "Tyres", "Spare Parts"],
  "Transport": ["Staff Transport Allowance", "Taxi Fare", "Trotro Fare", "Bolt / Uber", "Okada / Motorbike", "Courier / Dispatch", "Bus Fare", "Loading & Offloading", "Ingredient Pickup", "Errands", "Other"],
  "Factory Operations": ["Cleaning Supplies", "Pest Control", "Maintenance", "Repairs", "Equipment Servicing"],
  "Marketing": ["Social Media Ads", "Flyers", "Photography", "Sampling", "Signage", "Launch Event"],
  "Professional Fees": ["Accountant", "Lawyer", "Consultant", "Designer", "Website Developer"],
  "Compliance": ["FDA Registration", "Business Registration", "Fire Certificate", "Environmental Permit", "GRA Fees"],
  "Rent & Premises": ["Factory Rent", "Shop Rent", "Warehouse Rent", "Security"],
  "Office Expenses": ["Stationery", "Printer Ink", "Software", "Airtime"],
  "Pre-Opening: Factory Setup": ["Painting", "Plumbing", "Electrical Works", "Tiling", "Carpentry", "Signage Installation", "Shelving", "Display Area Setup"],
  "Pre-Opening: Launch Costs": ["Branding", "Logo Design", "Packaging Design", "Website", "Product Testing", "Photography", "Launch Event"],
  "Supplies": ["Purchase Order"],
  "Payroll": ["Payroll Run"],
  "Other": ["Other"]
};

const PAYMENT_METHODS = ["Cash", "Mobile Money", "Bank Transfer", "Card", "Cheque", "Petty Cash", "Credit / Owing", "POS Terminal", "Other"];

const WASTE_REASONS = ["Burnt / Overbaked", "Expired / Stale", "Returned by customer", "Damaged in transit", "Production error", "Other"];

const ASSET_CONDITIONS = ["New", "Good", "Fair", "Needs Repair", "Retired"];
