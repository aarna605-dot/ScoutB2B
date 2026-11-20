import re
from typing import Optional, List
from models.procurement import QueryParseResult

def parse_procurement_query(query: str) -> QueryParseResult:
    """
    Parses unstructured text like:
    'Need 2,000 steel furniture under ₹25,000 within 6 days'
    into structured procurement parameters.
    """
    text = (query or "").strip()
    if not text:
        return QueryParseResult(
            item_name="Commercial Supplies",
            quantity=500,
            max_budget=25000.0,
            delivery_days_limit=7,
            category="General B2B Wholesale",
            extracted_tags=[]
        )
    
    # 1. Budget extraction first (so 'budget 50k' isn't mistaken for quantity)
    budget = 20000.0
    budget_match = re.search(r'(?:under|below|within|budget\s*(?:of|is)?|max|<|<=|rs\.?|₹)\s*₹?\s*(\d+[\d,]*)\s*(k)?\b', text, re.IGNORECASE)
    if budget_match:
        b = float(budget_match.group(1).replace(",", ""))
        if budget_match.group(2):
            b *= 1000
        if b > 0:
            budget = b

    # 2. Delivery days
    days = 7
    days_match = re.search(r'(?:within|in|delivered within|delivery:?)?\s*(\d+)\s*(?:business\s*)?(?:days|day|d)\b', text, re.IGNORECASE)
    word_to_num = {
        "one": 1, "two": 2, "three": 3, "four": 4, "five": 5, 
        "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10,
        "a week": 7, "two weeks": 14
    }
    if days_match:
        days = int(days_match.group(1))
    else:
        for word, num in word_to_num.items():
            if re.search(rf'\b(?:within|in)?\s*{word}\s*days?\b', text, re.IGNORECASE):
                days = num
                break

    # 3. Quantity extraction (excluding budget phrase)
    text_for_qty = text
    if budget_match:
        text_for_qty = text.replace(budget_match.group(0), "")
        
    qty = 5000
    k_match = re.search(r'\b(\d+(?:\.\d+)?)\s*k\b', text_for_qty, re.IGNORECASE)
    qty_match = re.search(r'\b(\d+[\d,]*)\s*(?:pieces|pcs|units|containers|boxes|cups|bags|trays|shirts|mugs|bottles|kg|tons|m\b|meters)?', text_for_qty, re.IGNORECASE)
    if k_match:
        qty = int(float(k_match.group(1)) * 1000)
    elif qty_match:
        cleaned_num = qty_match.group(1).replace(",", "")
        if cleaned_num.isdigit() and int(cleaned_num) > 0:
            qty = int(cleaned_num)

    # 4. Product Name Extraction
    item = text
    # Remove filler prefixes
    item = re.sub(r'^(?:i\s*need|we\s*need|need|looking\s*for|require|we\s*require|want|source|please\s*get|procure)\s+', '', item, flags=re.IGNORECASE)
    # Remove timeline phrase
    item = re.sub(r'(?:delivered\s*)?(?:within|in)?\s*(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten|a\s*week)\s*(?:business\s*)?days?(?:\s*lead\s*time)?\.?', '', item, flags=re.IGNORECASE)
    # Remove budget phrase
    item = re.sub(r'(?:under|below|budget\s*(?:of|is)?|within|max|<|<=)\s*₹?\s*\d+[\d,]*(?:\s*k)?\b\.?', '', item, flags=re.IGNORECASE)
    item = re.sub(r'₹\s*\d+[\d,]*(?:\s*k)?\b', '', item)
    # Remove quantity phrase
    item = re.sub(r'\b\d+[\d,]*(?:\s*k)?\s*(?:units|containers|boxes|pieces|pcs|mugs|cups|bottles|shirts|bags|kg|tons|m\b|meters)?\b', '', item, flags=re.IGNORECASE)
    # Remove city
    item = re.sub(r'(?:delivered\s*)?(?:to|in|at)\s*(?:new\s*delhi|delhi|mumbai|bangalore|bengaluru|kolkata|hyderabad|chennai|pune|ahmedabad|jaipur|gurugram|noida|surat|moradabad)\b', '', item, flags=re.IGNORECASE)
    # Strip punctuation and dangling conjunctions
    item = re.sub(r'[,;.\-–—()]', ' ', item).strip()
    item = re.sub(r'\s+', ' ', item).strip()
    item = re.sub(r'^(?:for|with|of|and|in)\s+', '', item, flags=re.IGNORECASE)
    item = re.sub(r'\s+(?:for|with|of|and|in)$', '', item, flags=re.IGNORECASE).strip()

    if len(item) < 2:
        item = re.sub(r'[,.]', '', text).strip()

    product_name = " ".join([w.capitalize() for w in item.split() if w])

    # 5. Dynamic Category Inference
    lower_item = (product_name + " " + text).lower()
    category = "General B2B Wholesale"
    tags: List[str] = []

    if re.search(r'furniture|desk|chair|table|almirah|cabinet|rack|shelf|sofa|workstation|steel\s*furniture', lower_item):
        category = "Furniture & Fabrication"
        tags.extend(["Commercial Grade", "High Load Capacity"])
    elif re.search(r'brass|handicraft|casting|artisan|hardware\s*castings?', lower_item):
        category = "Artisan Handicraft & Brass"
        tags.extend(["Artisan Casting", "Corrosion Resistant"])
    elif re.search(r'steel|iron|metal|aluminium|copper|sheet\s*metal|pipe|tube|rod|wire|fastener|bolt|nut', lower_item):
        category = "Metal Fabrications & Hardware"
        tags.extend(["Industrial Grade", "Tensile Strength"])
    elif re.search(r'paper\s*cup|disposable\s*cup|container|box|packaging|kraft|bagasse|carton|pouch|tape|tray|corrugated', lower_item):
        category = "Packaging & Containers"
        tags.extend(["Food Grade", "Leakproof"])
    elif re.search(r'ceramic|mug|pottery|glass|crockery|plate|stoneware', lower_item):
        category = "Drinkware & Ceramics"
        tags.extend(["Kiln Fired", "Microwave Safe"])
    elif re.search(r'shirt|fabric|textile|cotton|canvas|bale|cloth|garment|apparel|yarn|denim', lower_item):
        category = "Textiles & Cotton Canvas"
        tags.extend(["100% Natural Cotton", "High GSM"])
    elif re.search(r'wood|timber|sheesham|plywood|teak|carving|mdf|lumber', lower_item):
        category = "Woodcraft & Timber Blanks"
        tags.extend(["Seasoned Hardwood", "Termite Treated"])
    elif re.search(r'chemical|plastic|polymer|resin|granule|pvc|polypropylene', lower_item):
        category = "Chemicals & Polymers"
        tags.extend(["Industrial Batch", "High Purity"])
    elif re.search(r'electronics|cable|switch|sensor|pcb|led|circuit', lower_item):
        category = "Electrical & Electronics"
        tags.extend(["IS-Certified", "High Durability"])

    if "kraft" in lower_item:
        tags.append("Kraft Paper")
    if "bio" in lower_item or "eco" in lower_item:
        tags.append("Eco-Friendly")

    return QueryParseResult(
        item_name=product_name or "Commercial Supplies",
        quantity=qty,
        max_budget=budget,
        delivery_days_limit=days,
        category=category,
        extracted_tags=list(set(tags))
    )
