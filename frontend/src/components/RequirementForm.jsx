import React, { useState } from 'react';
import { 
  Search, 
  ChevronDown, 
  ChevronUp, 
  Package, 
  IndianRupee, 
  Clock, 
  MapPin, 
  Sparkles, 
  Wand2, 
  Mic, 
  CheckCircle2, 
  Hash,
  Layers
} from 'lucide-react';
import { parseQuery } from '../services/api';
import { parseInputQuery } from '../utils/nlpParser';

const PRESETS = [
  {
    id: 'containers-kraft',
    label: '5,000 Food Containers (< ₹20k, 7 days)',
    query: 'I need 5,000 food containers, under ₹20,000, delivered within seven days.',
    item_name: 'Kraft Paper Food Containers (750ml)',
    quantity: 5000,
    max_budget: 20000,
    delivery_days_limit: 7,
    city: 'New Delhi',
    category: 'Packaging & Containers'
  },
  {
    id: 'brass-handicraft',
    label: '2,000 Brass Hardware Castings (< ₹25k, 6 days)',
    query: 'Need 2,000 brass hardware castings & fittings for artisan workshop under ₹25,000 within 6 days.',
    item_name: 'Artisan Brass Castings & Hardware Fittings',
    quantity: 2000,
    max_budget: 25000,
    delivery_days_limit: 6,
    city: 'Moradabad / Delhi NCR',
    category: 'Artisan Handicraft & Brass'
  },
  {
    id: 'cotton-canvas',
    label: '1,500m Raw Cotton Canvas Bales (< ₹18k, 5 days)',
    query: 'Looking for 1,500m unbleached raw cotton canvas bales under ₹18,000 delivered in 5 days.',
    item_name: 'Raw Cotton Canvas Bales (Unbleached)',
    quantity: 1500,
    max_budget: 18000,
    delivery_days_limit: 5,
    city: 'Surat / Jaipur',
    category: 'Textiles & Cotton Canvas'
  },
  {
    id: 'wood-sheesham',
    label: '1,000 Sheesham Wood Blanks (< ₹22k, 7 days)',
    query: 'Require 1,000 seasoned Sheesham wood carving blanks under ₹22,000 within 7 days.',
    item_name: 'Seasoned Sheesham Wood Carving Blanks',
    quantity: 1000,
    max_budget: 22000,
    delivery_days_limit: 7,
    city: 'Saharanpur / Jodhpur',
    category: 'Woodcraft & Timber Blanks'
  },
  {
    id: 'trays-eco',
    label: '2,500 Biodegradable Trays (< ₹15k, 5 days)',
    query: 'Need 2,500 biodegradable sugarcane bagasse 3-compartment meal trays under ₹15,000 within 5 days.',
    item_name: 'Biodegradable 3-Compartment Meal Trays',
    quantity: 2500,
    max_budget: 15000,
    delivery_days_limit: 5,
    city: 'Gurugram',
    category: 'Packaging & Containers'
  }
];

export default function RequirementForm({ onSearch, isLoading }) {
  const [queryText, setQueryText] = useState(PRESETS[0].query);
  const [activePreset, setActivePreset] = useState(PRESETS[0].id);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isListening, setIsListening] = useState(false);

  // Structured fields
  const [itemName, setItemName] = useState(PRESETS[0].item_name);
  const [quantity, setQuantity] = useState(PRESETS[0].quantity);
  const [maxBudget, setMaxBudget] = useState(PRESETS[0].max_budget);
  const [deliveryDays, setDeliveryDays] = useState(PRESETS[0].delivery_days_limit);
  const [deliveryCity, setDeliveryCity] = useState(PRESETS[0].city);
  const [category, setCategory] = useState(PRESETS[0].category);

  const handlePresetClick = (preset) => {
    setActivePreset(preset.id);
    setQueryText(preset.query);
    setItemName(preset.item_name);
    setQuantity(preset.quantity);
    setMaxBudget(preset.max_budget);
    setDeliveryDays(preset.delivery_days_limit);
    setDeliveryCity(preset.city);
    setCategory(preset.category);

    if (onSearch) {
      onSearch({
        query_text: preset.query,
        item_name: preset.item_name,
        quantity: preset.quantity,
        max_budget: preset.max_budget,
        delivery_days_limit: preset.delivery_days_limit,
        delivery_city: preset.city,
        category: preset.category
      });
    }
  };

  const handleQueryChange = (e) => {
    const val = e.target.value;
    setQueryText(val);
    setActivePreset('');

    // Synchronously parse typed intent
    if (val.trim().length > 1) {
      const parsed = parseInputQuery(val, {
        item_name: itemName,
        quantity,
        max_budget: maxBudget,
        delivery_days_limit: deliveryDays,
        delivery_city: deliveryCity,
        category
      });
      if (parsed) {
        setItemName(parsed.item_name);
        setQuantity(parsed.quantity);
        setMaxBudget(parsed.max_budget);
        setDeliveryDays(parsed.delivery_days_limit);
        setDeliveryCity(parsed.delivery_city);
        setCategory(parsed.category);
      }
    }
  };

  const handleVoiceInput = () => {
    // Check for Web Speech API or simulate voice trigger
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-IN';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      setIsListening(true);
      recognition.start();

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setQueryText(transcript);
        setIsListening(false);
        triggerAutoParse(transcript);
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };
    } else {
      // Simulate voice input example for quick testing
      setIsListening(true);
      setTimeout(() => {
        const voiceSample = "Need 500 wholesale ceramic mugs under ₹25,000 within 5 days.";
        setQueryText(voiceSample);
        setIsListening(false);
        triggerAutoParse(voiceSample);
      }, 800);
    }
  };

  const triggerAutoParse = async (text) => {
    if (!text.trim()) return;
    try {
      const parsed = parseInputQuery(text);
      if (parsed) {
        if (parsed.item_name) setItemName(parsed.item_name);
        if (parsed.quantity) setQuantity(parsed.quantity);
        if (parsed.max_budget) setMaxBudget(parsed.max_budget);
        if (parsed.delivery_days_limit) setDeliveryDays(parsed.delivery_days_limit);
        if (parsed.category) setCategory(parsed.category);
      }
    } catch (err) {
      console.warn("Auto-parse notice:", err);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    let finalItem = itemName;
    let finalQty = Number(quantity) || 500;
    let finalBudget = Number(maxBudget) || 25000;
    let finalDays = Number(deliveryDays) || 7;
    let finalCity = deliveryCity || "New Delhi";
    let finalCategory = category || "General B2B Wholesale";

    // If active preset, use preset exact parameters
    const matchedPreset = PRESETS.find(p => p.id === activePreset);
    if (matchedPreset && queryText === matchedPreset.query) {
      finalItem = matchedPreset.item_name;
      finalQty = matchedPreset.quantity;
      finalBudget = matchedPreset.max_budget;
      finalDays = matchedPreset.delivery_days_limit;
      finalCity = matchedPreset.city;
      finalCategory = matchedPreset.category;
    } else if (queryText.trim().length > 1) {
      // Re-parse the prompt dynamically
      const parsed = parseInputQuery(queryText, {
        item_name: itemName,
        quantity: finalQty,
        max_budget: finalBudget,
        delivery_days_limit: finalDays,
        delivery_city: finalCity,
        category: finalCategory
      });
      if (parsed) {
        finalItem = parsed.item_name || finalItem;
        finalQty = parsed.quantity || finalQty;
        finalBudget = parsed.max_budget || finalBudget;
        finalDays = parsed.delivery_days_limit || finalDays;
        finalCity = parsed.delivery_city || finalCity;
        finalCategory = parsed.category || finalCategory;
      }
    }

    setItemName(finalItem);
    setQuantity(finalQty);
    setMaxBudget(finalBudget);
    setDeliveryDays(finalDays);
    setDeliveryCity(finalCity);
    setCategory(finalCategory);

    onSearch({
      query_text: queryText,
      item_name: finalItem,
      quantity: finalQty,
      max_budget: finalBudget,
      delivery_days_limit: finalDays,
      delivery_city: finalCity,
      category: finalCategory
    });
  };

  return (
    <div className="glass-panel requirement-card">
      <div className="form-header-bar">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <Sparkles size={16} color="var(--text-primary)" />
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.005em' }}>
              Supplier Search Brief
            </h2>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Describe your wholesale raw material or packaging requirements in plain English or Hindi. We audit supplier pricing, calculate landed costs, and unmask hidden surcharges for small businesses & artisans.
          </p>
        </div>

        <button 
          type="button"
          className="btn-icon-subtle"
          onClick={() => setShowAdvanced(!showAdvanced)}
          title="Toggle exact structured procurement fields"
        >
          {showAdvanced ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          <span>{showAdvanced ? 'Hide Fields' : 'Customize Exact Fields'}</span>
        </button>
      </div>

      {/* Preset Chips */}
      <div className="presets-container">
        <span className="presets-label">Popular Scenarios:</span>
        {PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            className={`preset-chip ${activePreset === p.id ? 'active' : ''}`}
            onClick={() => handlePresetClick(p)}
          >
            {p.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit}>
        <div className="prompt-box-wrapper">
          <textarea
            id="input-procurement-prompt"
            className="prompt-textarea"
            value={queryText}
            onChange={handleQueryChange}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            placeholder="e.g. I need 5,000 food containers, under ₹20,000, delivered within seven days."
            rows={2}
          />
          
          <div style={{ position: 'absolute', right: '12px', top: '12px', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button
              type="button"
              className="btn-icon-subtle"
              style={{ 
                height: '44px', 
                width: '44px', 
                padding: 0, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                borderRadius: '10px',
                borderColor: isListening ? '#111827' : 'var(--border-subtle)',
                background: isListening ? '#f3f4f6' : '#ffffff',
                color: isListening ? '#111827' : 'var(--text-secondary)'
              }}
              onClick={handleVoiceInput}
              title={isListening ? "Listening..." : "Click to speak requirement (Voice Input)"}
            >
              <Mic size={18} className={isListening ? "animate-pulse" : ""} />
            </button>

            <button
              type="submit"
              id="btn-submit-search"
              className="prompt-action-btn"
              disabled={isLoading || !queryText.trim()}
              title="Deploy TinyFish Research Agent"
            >
              <Search size={20} />
            </button>
          </div>
        </div>

        {/* Real-time Entity Recognition Preview Bar */}
        <div className="nlp-entities-preview">
          <span style={{ color: 'var(--text-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem' }}>
            <Layers size={13} color="var(--text-secondary)" />
            <span>Detected Specifications:</span>
          </span>
          <span className="nlp-entity-tag highlight">
            <Package size={12} />
            <span>Product: <strong>{itemName || 'Packaging'}</strong></span>
          </span>
          <span className="nlp-entity-tag">
            <Hash size={12} />
            <span>Volume: <strong>{Number(quantity).toLocaleString()} pcs</strong></span>
          </span>
          <span className="nlp-entity-tag">
            <IndianRupee size={12} />
            <span>Budget: <strong>₹{Number(maxBudget).toLocaleString('en-IN')}</strong></span>
          </span>
          <span className="nlp-entity-tag">
            <Clock size={12} />
            <span>Deadline: <strong>{deliveryDays} Days</strong></span>
          </span>
          <span className="nlp-entity-tag">
            <MapPin size={12} />
            <span>Destination: <strong>{deliveryCity}</strong></span>
          </span>
        </div>

        {/* Advanced Structured Parameters Accordion */}
        {showAdvanced && (
          <div className="structured-inputs-grid">
            <div className="field-group">
              <label className="field-label" htmlFor="field-item">
                <Package size={14} color="#818cf8" /> Product Title / Specs
              </label>
              <input
                id="field-item"
                type="text"
                className="field-input"
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
              />
            </div>

            <div className="field-group">
              <label className="field-label" htmlFor="field-quantity">
                <Hash size={14} color="#34d399" /> Required Quantity (Units)
              </label>
              <input
                id="field-quantity"
                type="number"
                min="100"
                step="100"
                className="field-input"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>

            <div className="field-group">
              <label className="field-label" htmlFor="field-budget">
                <IndianRupee size={14} color="#f59e0b" /> Max Budget Ceiling (INR)
              </label>
              <input
                id="field-budget"
                type="number"
                min="1000"
                step="500"
                className="field-input"
                value={maxBudget}
                onChange={(e) => setMaxBudget(e.target.value)}
              />
            </div>

            <div className="field-group">
              <label className="field-label" htmlFor="field-delivery">
                <Clock size={14} color="#38bdf8" /> Max Delivery Lead Time (Days)
              </label>
              <input
                id="field-delivery"
                type="number"
                min="1"
                max="30"
                className="field-input"
                value={deliveryDays}
                onChange={(e) => setDeliveryDays(e.target.value)}
              />
            </div>

            <div className="field-group">
              <label className="field-label" htmlFor="field-city">
                <MapPin size={14} color="#f43f5e" /> Delivery Destination City
              </label>
              <input
                id="field-city"
                type="text"
                className="field-input"
                value={deliveryCity}
                onChange={(e) => setDeliveryCity(e.target.value)}
              />
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            <CheckCircle2 size={15} color="#059669" />
            <span>Verified pricing across IndiaMART, Moglix & JustDial</span>
          </div>

          <button
            type="submit"
            id="btn-deploy-agent"
            className="btn-primary"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Wand2 size={16} className="animate-spin" />
                <span>Searching suppliers...</span>
              </>
            ) : (
              <>
                <Search size={16} />
                <span>Search Verified Suppliers</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
