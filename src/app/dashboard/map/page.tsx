"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ComposableMap, Geographies, Geography } from 'react-simple-maps';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const DATE_START = new Date('2025-06-01');
const DATE_END = new Date('2025-07-31');
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const NUM_DAYS = Math.round((DATE_END.getTime() - DATE_START.getTime()) / MS_PER_DAY);

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

// Using the correct CDN URL for world countries TopoJSON
const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

// Helper function to get country name from ISO code
function getCountryName(isoCode) {
  const countryNames = {
    '840': 'United States',
    '124': 'Canada', 
    '826': 'United Kingdom',
    '276': 'Germany',
    '250': 'France',
    '36': 'Australia',
    '392': 'Japan',
    '356': 'India',
    '156': 'China',
    '076': 'Brazil',
    'US': 'United States',
    'CA': 'Canada',
    'GB': 'United Kingdom', 
    'DE': 'Germany',
    'FR': 'France',
    'AU': 'Australia',
    'JP': 'Japan',
    'IN': 'India',
    'CN': 'China',
    'BR': 'Brazil',
    'ES': 'Spain',
    'NL': 'Netherlands',
    'RU': 'Russia',
    'TR': 'Turkey',
    'KR': 'South Korea',
    'NG': 'Nigeria',
    'ZA': 'South Africa',
    'NZ': 'New Zealand'
  };
  return countryNames[isoCode] || isoCode;
}

// Helper function to map country codes for data lookup
function getCountryCodeMapping(isoCode) {
  const countryMapping = {
    '840': 'US',  // United States
    '124': 'CA',  // Canada
    '826': 'GB',  // United Kingdom
    '276': 'DE',  // Germany
    '250': 'FR',  // France
    '36': 'AU',   // Australia
    '392': 'JP',  // Japan
    '356': 'IN',  // India
    '156': 'CN',  // China
    '076': 'BR',  // Brazil
  };
  return countryMapping[isoCode] || isoCode;
}

export default function MapView() {
  const router = useRouter();
  const [tooltip, setTooltip] = useState(null);
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [countryData, setCountryData] = useState({});
  const [categoryData, setCategoryData] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sliderValue, setSliderValue] = useState(NUM_DAYS);
  const [startDate, setStartDate] = useState(formatDate(DATE_START));
  const [endDate, setEndDate] = useState(formatDate(DATE_END));
  const [selectedCategories, setSelectedCategories] = useState(new Set(['all']));
  const [totalApiRequests, setTotalApiRequests] = useState(0);
  
  // Get selected chain from session storage (like the main dashboard)
  const [selectedChain, setSelectedChain] = useState('');
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => {
    setIsClient(true);
    if (typeof window !== 'undefined') {
      const selected = sessionStorage.getItem('selected_chain') || 'BSC';
      setSelectedChain(selected);
    }
  }, []);

  // Update endDate when slider changes
  useEffect(() => {
    const newEnd = new Date(DATE_START.getTime() + sliderValue * MS_PER_DAY);
    setEndDate(formatDate(newEnd));
  }, [sliderValue]);

  // Fetch country data from Supabase
  useEffect(() => {
    async function fetchCountryData() {
      if (!selectedChain) return;
      setLoading(true);
      setError(null);
      
      try {
        // Debug: Log what we're trying to fetch
        console.log('Fetching data for:', { selectedChain, startDate, endDate });
        
        // Fetch aggregated country data for the selected chain and date range
        const { data, error } = await supabase
          .from('aggregated_country_chain')
          .select('country, users, date')
          .ilike('chain', selectedChain)
          .gte('date', startDate)
          .lte('date', endDate);
        
        if (error) throw error;
        
        console.log('Raw data from Supabase:', data);
        
        // Aggregate by country
        const countryTotals = {};
        if (data && data.length > 0) {
          data.forEach(row => {
            if (!countryTotals[row.country]) countryTotals[row.country] = 0;
            countryTotals[row.country] += row.users || 0;
          });
        } else {
          // If no data, let's add some mock data for testing
          console.log('No data found, using mock data');
          countryTotals['US'] = 12345;
          countryTotals['CA'] = 2345;
          countryTotals['FR'] = 3456;
          countryTotals['GB'] = 4567;
          countryTotals['DE'] = 5678;
        }
        
        console.log('Country totals:', countryTotals);
        console.log('Countries in your data:', Object.keys(countryTotals));
        setCountryData(countryTotals);
        
        // Calculate total API requests
        const total = Object.values(countryTotals).reduce((sum, val) => sum + val, 0);
        setTotalApiRequests(total);
        
      } catch (err) {
        console.error('Error fetching country data:', err);
        setError(err.message);
        // Fallback to mock data on error
        const mockData = {
          'US': 12345,
          'CA': 2345,
          'FR': 3456,
          'GB': 4567,
          'DE': 5678
        };
        setCountryData(mockData);
        setTotalApiRequests(Object.values(mockData).reduce((sum, val) => sum + val, 0));
      } finally {
        setLoading(false);
      }
    }
    
    fetchCountryData();
  }, [selectedChain, startDate, endDate]);

  // Fetch category data for the selected country and chain using the new aggregated view
  useEffect(() => {
    async function fetchCategoryData() {
      if (!selectedChain || !selectedCountry) {
        setCategoryData({});
        return;
      }
      
      try {
        // Map the selected country code to the database format
        const mappedCountry = getCountryCodeMapping(selectedCountry);
        console.log('=== CATEGORY DATA FETCH ===');
        console.log('Selected country:', selectedCountry);
        console.log('Mapped country:', mappedCountry);
        console.log('Selected chain:', selectedChain);
        console.log('Date range:', startDate, 'to', endDate);
        
        // First, let's discover what columns are available in the new view
        const { data: schemaTest, error: schemaError } = await supabase
          .from('aggregated_country_chain_category')
          .select('*')
          .limit(1);
        
        console.log('Schema discovery - Available columns:', schemaTest && schemaTest.length > 0 ? Object.keys(schemaTest[0]) : 'No data');
        
        // Fetch category data for the selected chain and country using new aggregated view
        // Common column names might be: users, api_requests, request_count, total_users, etc.
        const { data: categoryChainData, error: categoryError } = await supabase
          .from('aggregated_country_chain_category')
          .select('*') // Select all columns to see what's available
          .ilike('chain', selectedChain)
          .ilike('country', mappedCountry)
          .gte('date', startDate)
          .lte('date', endDate);
        
        if (categoryError) throw categoryError;
        
        console.log('Category chain data for', selectedCountry, ':', categoryChainData);
        
        // Aggregate by category
        const categoryTotals = {};
        if (categoryChainData && categoryChainData.length > 0) {
          console.log('Sample row from categoryChainData:', categoryChainData[0]);
          
          // Detect the column name for user/request counts
          const firstRow = categoryChainData[0];
          const countColumnCandidates = ['users', 'api_requests', 'request_count', 'total_users', 'count', 'total_api_requests'];
          let countColumn = null;
          
          for (const candidate of countColumnCandidates) {
            if (firstRow.hasOwnProperty(candidate)) {
              countColumn = candidate;
              console.log('Found count column:', countColumn);
              break;
            }
          }
          
          if (!countColumn) {
            // If none of the standard names are found, look for any numeric column
            const numericColumns = Object.keys(firstRow).filter(key => 
              typeof firstRow[key] === 'number' && key !== 'date'
            );
            if (numericColumns.length > 0) {
              countColumn = numericColumns[0]; // Use the first numeric column
              console.log('Using first numeric column as count:', countColumn);
            }
          }
          
          if (countColumn) {
            categoryChainData.forEach(row => {
              if (!categoryTotals[row.category]) categoryTotals[row.category] = 0;
              categoryTotals[row.category] += row[countColumn] || 0;
            });
            console.log('Aggregated category totals using column', countColumn, ':', categoryTotals);
          } else {
            console.error('Could not find a count column in the data. Available columns:', Object.keys(firstRow));
          }
        } else {
          console.log('No category data found for country:', selectedCountry, 'chain:', selectedChain);
        }
        
        setCategoryData(categoryTotals);
        console.log('=== END CATEGORY FETCH ===');
      } catch (err) {
        console.error('Error fetching category data:', err);
        setCategoryData({});
      }
    }
    
    fetchCategoryData();
  }, [selectedChain, selectedCountry, startDate, endDate]);

  // Helper function to get API requests for selected country using proper mapping
  const getSelectedCountryApiRequests = () => {
    if (!selectedCountry) return 0;
    
    // Try the same mapping logic as used in the map rendering
    const mappedCode = getCountryCodeMapping(selectedCountry);
    
    console.log('Getting API requests for selectedCountry:', selectedCountry);
    console.log('Mapped to:', mappedCode);
    console.log('countryData[selectedCountry]:', countryData[selectedCountry]);
    console.log('countryData[mappedCode]:', countryData[mappedCode]);
    console.log('Available country keys:', Object.keys(countryData));
    
    // Try different lookups in order of preference
    const result = countryData[selectedCountry] || 
                   countryData[mappedCode] || 
                   0;
    
    console.log('Final result:', result);
    return result;
  };

  // Handle country click
  const handleCountryClick = (geo) => {
    const countryCode = geo.properties.ISO_A2 || geo.properties.iso_a2 || geo.properties.ADM0_A3 || geo.id;
    const countryName = geo.properties.NAME_EN || geo.properties.NAME || geo.properties.name || geo.properties.NAME_LONG;
    console.log('Country clicked:', countryName, 'Code:', countryCode);
    console.log('All properties:', geo.properties);
    
    if (countryCode && countryCode !== 'undefined') {
      console.log('Setting selectedCountry to:', countryCode);
      setSelectedCountry(countryCode);
    } else {
      console.log('Country code is undefined, not setting selectedCountry');
    }
  };

  // Show loading until client-side is ready to prevent hydration issues
  if (!isClient) {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center',
        minHeight: '100vh', 
        backgroundColor: '#f7f7f7'
      }}>
        <div style={{ fontSize: '1.2rem', color: '#6b7280' }}>Loading map...</div>
      </div>
    );
  }

  return (
    <main style={{ minHeight: '100vh', background: '#f7f7f7', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', padding: '2rem 0', position: 'relative' }}>
      <button
        style={{ position: 'absolute', top: 32, left: 32, padding: '0.7rem 2rem', fontSize: '1rem', borderRadius: 6, background: '#2d2d2d', color: '#fff', border: 'none', cursor: 'pointer', zIndex: 10 }}
        onClick={() => router.push('/dashboard')}
      >
        Back to Dashboard
      </button>
      
      {/* First Row - Title and Cards */}
      <div style={{ width: '100%', maxWidth: 1200, display: 'flex', gap: 20, marginBottom: 20, alignItems: 'flex-start' }}>
        {/* Left: Title and Total Card */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 20 }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, margin: 0, color: '#2d2d2d' }}>World Map - {selectedChain}</h1>
          {/* Total API Requests Card */}
          <div style={{ background: '#fff', borderRadius: 16, padding: '1.5rem', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', textAlign: 'center' }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 600, marginBottom: 12, color: '#2d2d2d' }}>
              {selectedCountry ? `API Requests - ${getCountryName(selectedCountry)}` : 'Total API Requests'}
            </h2>
            <div style={{ fontSize: '2.5rem', fontWeight: 700, color: '#3b82f6', margin: '16px 0' }}>
              {loading ? 'Loading...' : (selectedCountry ? getSelectedCountryApiRequests().toLocaleString() : totalApiRequests.toLocaleString())}
            </div>
            <div style={{ color: '#6b7280', fontSize: '1rem' }}>
              {selectedCountry ? `For ${getCountryName(selectedCountry)} in selected date range` : 'For the selected date range'}
            </div>
            {selectedCountry && (
              <button
                style={{ marginTop: 12, padding: '0.5rem 1rem', fontSize: '0.9rem', borderRadius: 6, background: '#e5e7eb', color: '#2d2d2d', border: 'none', cursor: 'pointer' }}
                onClick={() => setSelectedCountry(null)}
              >
                Clear Selection
              </button>
            )}
          </div>
        </div>
        
        {/* Right: Category Controls */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Category Breakdown */}
          {selectedCountry && (
            <div style={{ background: '#fff', borderRadius: 16, padding: '1.5rem', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 12, color: '#2d2d2d' }}>
                Categories in {getCountryName(selectedCountry)}
              </h3>
              <p style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: 16 }}>
                {selectedChain} chain category breakdown for {getCountryName(selectedCountry)} in the selected date range
              </p>
              {Object.keys(categoryData).length > 0 ? (
                <div>
                  {Object.entries(categoryData)
                    .sort(([,a], [,b]) => b - a) // Sort by count descending
                    .map(([category, users]) => (
                      <div key={category} style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        marginBottom: 12, 
                        fontSize: '0.95rem',
                        padding: '8px 12px',
                        backgroundColor: '#f8fafc',
                        borderRadius: 8,
                        border: '1px solid #e2e8f0'
                      }}>
                        <span style={{ color: '#374151', fontWeight: 500 }}>{category}</span>
                        <span style={{ fontWeight: 700, color: '#3b82f6' }}>{users.toLocaleString()}</span>
                      </div>
                    ))
                  }
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #e5e7eb', textAlign: 'center' }}>
                    <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                      Total: {Object.values(categoryData).reduce((sum, val) => sum + val, 0).toLocaleString()} API requests
                    </span>
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '20px', color: '#9ca3af' }}>
                  No category data available for {getCountryName(selectedCountry)}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Second Row - Date Range Card (Full Width) */}
      <div style={{ width: '100%', maxWidth: 1200, marginBottom: 20 }}>
        {/* Date Range Slider */}
        <div style={{ background: '#fff', borderRadius: 16, padding: '1.5rem', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 12, color: '#2d2d2d' }}>Date Range</h2>
          <input
            type="range"
            min={0}
            max={NUM_DAYS}
            value={sliderValue}
            onChange={e => setSliderValue(+e.target.value)}
            style={{ width: 300 }}
          />
          <div style={{ marginTop: 10, fontSize: '0.95rem', color: '#444' }}>
            {startDate} to {endDate}
          </div>
        </div>
      </div>
      <div style={{ width: 900, height: 500, background: '#e5e7eb', borderRadius: 16, overflow: 'hidden', position: 'relative', boxShadow: '0 4px 24px rgba(0,0,0,0.07)' }}>
        <ComposableMap
          projectionConfig={{ scale: 150 }}
          width={900}
          height={500}
          style={{ width: '100%', height: '100%' }}
        >
          <Geographies geography={geoUrl}>
            {({ geographies }) => {
              console.log('Rendering map with countryData:', countryData);
              console.log('Sample geography properties:', geographies[0]?.properties);
              console.log('All property keys:', Object.keys(geographies[0]?.properties || {}));
              console.log('Available country data keys:', Object.keys(countryData));
              console.log('Selected country:', selectedCountry);
              
              return geographies.map(geo => {
                // Try different possible property names for country codes and names
                const iso = geo.properties.ISO_A2 || geo.properties.iso_a2 || geo.properties.ADM0_A3 || geo.id;
                const iso3 = geo.properties.ISO_A3 || geo.properties.iso_a3;
                const countryName = geo.properties.NAME_EN || geo.properties.NAME || geo.properties.name || geo.properties.NAME_LONG;
                
                // Try different possible country code formats and create mapping
                let apiRequests = 0;
                
                // Create a mapping for common mismatches
                const countryMapping = {
                  '840': 'US',  // United States
                  '124': 'CA',  // Canada
                  '826': 'GB',  // United Kingdom
                  '276': 'DE',  // Germany
                  '250': 'FR',  // France
                  '36': 'AU',   // Australia
                  '392': 'JP',  // Japan
                  '356': 'IN',  // India
                  '156': 'CN',  // China
                  '076': 'BR',  // Brazil
                };
                
                // First try direct matches, then try mapping
                apiRequests = countryData[iso] || countryData[iso3] || countryData[countryName] || 
                             (countryMapping[iso] ? countryData[countryMapping[iso]] : 0) || 0;
                const isSelected = selectedCountry === iso;
                const hasData = apiRequests > 0;
                
                // Debug all countries with data and a few random ones  
                if (hasData || Math.random() < 0.02 || isSelected) {
                  console.log(`Country: ${countryName} (${iso}), API Requests: ${apiRequests}, Has Data: ${hasData}, Is Selected: ${isSelected}, selectedCountry: ${selectedCountry}, Fill Color: ${isSelected ? '#ff0000' : (hasData ? '#0066ff' : '#cccccc')}`);
                }
                
                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    onClick={() => handleCountryClick(geo)}
                    onMouseEnter={e => {
                      console.log(`Mouse enter: ${countryName} (${iso}/${iso3}), API: ${apiRequests}, Has Data: ${hasData}, CountryData has ${iso}: ${!!countryData[iso]}, has ${iso3}: ${!!countryData[iso3]}`);
                      setTooltip({
                        iso,
                        name: countryName,
                        x: e.clientX,
                        y: e.clientY,
                        apiRequests,
                      });
                    }}
                    onMouseMove={e => {
                      if (tooltip) {
                        setTooltip(prev => ({ ...prev, x: e.clientX, y: e.clientY }));
                      }
                    }}
                    onMouseLeave={() => {
                      console.log(`Mouse leave: ${countryName}`);
                      setTooltip(null);
                    }}
                    style={{
                      default: { 
                        fill: isSelected ? '#1e40af' : (hasData ? '#3b82f6' : '#e5e7eb'), 
                        outline: 'none', 
                        stroke: '#fff', 
                        strokeWidth: 0.5,
                        cursor: 'pointer'
                      },
                      hover: { 
                        fill: isSelected ? '#1e3a8a' : (hasData ? '#2563eb' : '#d1d5db'), 
                        outline: 'none', 
                        stroke: '#fff', 
                        strokeWidth: 1 
                      },
                      pressed: { 
                        fill: '#1e40af', 
                        outline: 'none', 
                        stroke: '#fff', 
                        strokeWidth: 1 
                      },
                    }}
                  />
                );
              });
            }}
          </Geographies>
        </ComposableMap>
        {tooltip && (
          <div style={{
            position: 'fixed',
            left: tooltip.x + 15,
            top: tooltip.y + 15,
            background: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: 8,
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            padding: '12px 16px',
            zIndex: 1000,
            pointerEvents: 'none',
            minWidth: 180,
          }}>
            <div style={{ fontWeight: 700, color: '#2d2d2d', marginBottom: 4 }}>{tooltip.name || 'Unknown Country'}</div>
            <div style={{ color: '#3b82f6', fontWeight: 600, marginBottom: 6 }}>
              API Requests: {tooltip.apiRequests.toLocaleString()}
            </div>
            <div style={{ color: '#6b7280', fontSize: '0.9rem' }}>
              Click to see category breakdown
            </div>
          </div>
        )}
      </div>
      <div style={{ marginTop: 32, color: '#374151', fontSize: '1.1rem', maxWidth: 700, textAlign: 'center' }}>
        <b>Interactive Map Instructions:</b><br />
        - Hover over countries with data to see API request totals<br />
        - Click on a country to see detailed category breakdown<br />
        - Use the date range slider to filter data by time period
      </div>
    </main>
  );
}
