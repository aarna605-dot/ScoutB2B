/**
 * Intelligent client-side procurement NLP query parser for ProcureSaathi.
 * Extracts: item_name, quantity, max_budget, delivery_days_limit, delivery_city, category.
 */
export function parseInputQuery(text, fallbackDefaults = {}) {
  const raw = (text || "").trim();
  if (!raw) {
    return {
      item_name: fallbackDefaults.item_name || "Commercial Raw Material",
      quantity: fallbackDefaults.quantity || 500,
      max_budget: fallbackDefaults.max_budget || 25000,
      delivery_days_limit: fallbackDefaults.delivery_days_limit || 7,
      delivery_city: fallbackDefaults.delivery_city || "New Delhi",
      category: fallbackDefaults.category || "General B2B Wholesale"
    };
  }

  // 1. Budget extraction first (so 'budget 50k' isn't mistaken for quantity)
  let maxBudget = null;
  const budgetMatch = raw.match(/(?:under|below|budget\s*(?:of|is)?|within|max|<|<=|rs\.?|₹)\s*₹?\s*(\d+[\d,]*)\s*(k)?\b/i);
  if (budgetMatch) {
    let b = parseFloat(budgetMatch[1].replace(/,/g, ''));
    if (budgetMatch[2]) b *= 1000;
    if (b > 0) maxBudget = b;
  }

  // 2. Timeline extraction
  let deliveryDaysLimit = null;
  const daysMatch = raw.match(/(?:within|in|delivered within|delivery:?)?\s*(\d+)\s*(?:business\s*)?(?:days|day|d)\b/i);
  const wordDays = { 'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5, 'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10, 'a week': 7, 'two weeks': 14 };
  if (daysMatch) {
    deliveryDaysLimit = parseInt(daysMatch[1], 10);
  } else {
    for (const [w, n] of Object.entries(wordDays)) {
      if (new RegExp('\\b(?:within|in)?\\s*' + w + '\\s*days?\\b', 'i').test(raw)) {
        deliveryDaysLimit = n;
        break;
      }
    }
  }

  // 3. Quantity extraction (excluding budget text)
  let textForQty = raw;
  if (budgetMatch) {
    textForQty = textForQty.replace(budgetMatch[0], '');
  }
  let quantity = null;
  const kMatch = textForQty.match(/\b(\d+(?:\.\d+)?)\s*k\b/i);
  const qtyMatch = textForQty.match(/\b(\d+[\d,]*)\s*(?:units|containers|boxes|pieces|pcs|mugs|cups|bottles|shirts|bags|kg|tons|m\b|meters)?/i);
  if (kMatch) {
    quantity = Math.round(parseFloat(kMatch[1]) * 1000);
  } else if (qtyMatch) {
    const val = parseInt(qtyMatch[1].replace(/,/g, ''), 10);
    if (val > 0) quantity = val;
  }

  // 4. Destination extraction
  let deliveryCity = fallbackDefaults.delivery_city || "New Delhi";
  const cityMatch = raw.match(/(?:delivered\s*)?(?:to|in|at)\s*(new\s*delhi|delhi|mumbai|bangalore|bengaluru|kolkata|hyderabad|chennai|pune|ahmedabad|jaipur|gurugram|noida|surat|moradabad)\b/i);
  if (cityMatch) {
    deliveryCity = cityMatch[1].charAt(0).toUpperCase() + cityMatch[1].slice(1).toLowerCase();
  }

  // 5. Clean Item Extraction
  let item = raw;
  item = item.replace(/^(?:i\s*need|we\s*need|need|looking\s*for|require|we\s*require|want|source|please\s*get|procure)\s+/i, '');
  item = item.replace(/(?:delivered\s*)?(?:within|in)?\s*(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten|a\s*week)\s*(?:business\s*)?days?(?:\s*lead\s*time)?\.?/gi, '');
  item = item.replace(/(?:under|below|budget\s*(?:of|is)?|within|max|<|<=)\s*₹?\s*\d+[\d,]*(?:\s*k)?\b\.?/gi, '');
  item = item.replace(/₹\s*\d+[\d,]*(?:\s*k)?\b/gi, '');
  item = item.replace(/\b\d+[\d,]*(?:\s*k)?\s*(?:units|containers|boxes|pieces|pcs|mugs|cups|bottles|shirts|bags|kg|tons|m\b|meters)?\b/gi, '');
  if (cityMatch) {
    item = item.replace(cityMatch[0], '');
  }
  item = item.replace(/[,;.\-–—()]/g, ' ').replace(/\s+/g, ' ').trim();
  item = item.replace(/^(?:for|with|of|and|in)\s+/i, '').replace(/\s+(?:for|with|of|and|in)$/i, '').trim();

  if (item.length < 2) {
    item = raw.replace(/[,.]/g, '').trim();
  }

  const formattedItem = item.split(' ').filter(Boolean).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');

  // 6. Dynamic Category Inference
  const lowerItem = (formattedItem + ' ' + raw).toLowerCase();
  let category = "General B2B Wholesale";
  if (/furniture|desk|chair|table|almirah|cabinet|rack|shelf|sofa|workstation|steel\s*furniture/.test(lowerItem)) {
    category = "Furniture & Fabrication";
  } else if (/brass|handicraft|casting|artisan|hardware\s*castings?/.test(lowerItem)) {
    category = "Artisan Handicraft & Brass";
  } else if (/steel|iron|metal|aluminium|copper|sheet\s*metal|pipe|tube|rod|wire|fastener|bolt|nut/.test(lowerItem)) {
    category = "Metal Fabrications & Hardware";
  } else if (/paper\s*cup|disposable\s*cup|container|box|packaging|kraft|bagasse|carton|pouch|tape|tray|corrugated/.test(lowerItem)) {
    category = "Packaging & Containers";
  } else if (/ceramic|mug|pottery|glass|crockery|plate|stoneware/.test(lowerItem)) {
    category = "Drinkware & Ceramics";
  } else if (/shirt|fabric|textile|cotton|canvas|bale|cloth|garment|apparel|yarn|denim/.test(lowerItem)) {
    category = "Textiles & Cotton Canvas";
  } else if (/wood|timber|sheesham|plywood|teak|carving|mdf|lumber/.test(lowerItem)) {
    category = "Woodcraft & Timber Blanks";
  } else if (/chemical|plastic|polymer|resin|granule|pvc|polypropylene/.test(lowerItem)) {
    category = "Chemicals & Polymers";
  } else if (/electronics|cable|switch|sensor|pcb|led|circuit/.test(lowerItem)) {
    category = "Electrical & Electronics";
  }

  const finalQty = quantity || fallbackDefaults.quantity || 500;
  const finalBudget = maxBudget || fallbackDefaults.max_budget || Math.max(finalQty * 25, 20000);
  const finalDays = deliveryDaysLimit || fallbackDefaults.delivery_days_limit || 7;

  return {
    item_name: formattedItem || fallbackDefaults.item_name || "Commercial Supplies",
    quantity: finalQty,
    max_budget: finalBudget,
    delivery_days_limit: finalDays,
    delivery_city: deliveryCity,
    category
  };
}
