'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { Line, Bar } from 'react-chartjs-2';
import { ComposableMap, Geographies, Geography } from 'react-simple-maps';
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  TimeScale,
  BarElement,
} from 'chart.js';
import 'chartjs-adapter-date-fns';

ChartJS.register(LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Legend, TimeScale, BarElement);

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const DATE_START = new Date('2025-06-01');
const DATE_END = new Date('2025-07-31');
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const NUM_DAYS = Math.round((DATE_END.getTime() - DATE_START.getTime()) / MS_PER_DAY);

// Using the correct CDN URL for world countries TopoJSON
const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

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

// Custom dual-knob slider component
function DualRangeSlider({ min, max, startValue, endValue, onStartChange, onEndChange, width = 400 }) {
  const handleStartChange = (e) => {
    const newStart = parseInt(e.target.value);
    if (newStart < endValue) {
      onStartChange(newStart);
    }
  };

  const handleEndChange = (e) => {
    const newEnd = parseInt(e.target.value);
    if (newEnd > startValue) {
      onEndChange(newEnd);
    }
  };

  const startPercent = ((startValue - min) / (max - min)) * 100;
  const endPercent = ((endValue - min) / (max - min)) * 100;

  return (
    <div style={{ position: 'relative', width: width, height: 40 }}>
      {/* Track */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: 0,
        right: 0,
        height: 4,
        background: '#e5e7eb',
        borderRadius: 2,
        transform: 'translateY(-50%)'
      }} />
      
      {/* Active range */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: `${startPercent}%`,
        right: `${100 - endPercent}%`,
        height: 4,
        background: '#3b82f6',
        borderRadius: 2,
        transform: 'translateY(-50%)'
      }} />
      
      {/* Start knob */}
      <input
        type="range"
        min={min}
        max={max}
        value={startValue}
        onChange={handleStartChange}
        style={{
          position: 'absolute',
          top: '50%',
          left: 0,
          right: 0,
          width: '100%',
          height: 40,
          background: 'transparent',
          pointerEvents: 'auto',
          transform: 'translateY(-50%)',
          WebkitAppearance: 'none',
          appearance: 'none',
          zIndex: 2
        }}
      />
      
      {/* End knob */}
      <input
        type="range"
        min={min}
        max={max}
        value={endValue}
        onChange={handleEndChange}
        style={{
          position: 'absolute',
          top: '50%',
          left: 0,
          right: 0,
          width: '100%',
          height: 40,
          background: 'transparent',
          pointerEvents: 'auto',
          transform: 'translateY(-50%)',
          WebkitAppearance: 'none',
          appearance: 'none',
          zIndex: 1
        }}
      />
      
      {/* Knob indicators */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: `${startPercent}%`,
        width: 20,
        height: 20,
        background: '#3b82f6',
        borderRadius: '50%',
        transform: 'translate(-50%, -50%)',
        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
        pointerEvents: 'none',
        zIndex: 3
      }} />
      <div style={{
        position: 'absolute',
        top: '50%',
        left: `${endPercent}%`,
        width: 20,
        height: 20,
        background: '#3b82f6',
        borderRadius: '50%',
        transform: 'translate(-50%, -50%)',
        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
        pointerEvents: 'none',
        zIndex: 3
      }} />
    </div>
  );
}

export default function Dashboard() {
  const [chain, setChain] = useState<string | null>(null);
  const [rawData, setRawData] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [chartData, setChartData] = useState({ dates: [], datasets: [] });
  const [chartLoading, setChartLoading] = useState(false);
  const [chartError, setChartError] = useState<string | null>(null);
  const [sliderValue,      setSliderValue]      = useState(NUM_DAYS);
  const [startSliderValue, setStartSliderValue] = useState(0);
  const [startDate, setStartDate] = useState(formatDate(DATE_START));
  const [endDate, setEndDate] = useState(formatDate(DATE_END));
  
  console.log('Initial state:', { 
    DATE_START: formatDate(DATE_START), 
    DATE_END: formatDate(DATE_END), 
    NUM_DAYS, 
    startDate, 
    endDate 
  });
  const [countryData, setCountryData] = useState({ rows: [], chains: [] });
  const [countryLoading, setCountryLoading] = useState(false);
  const [countryError, setCountryError] = useState<string | null>(null);
  const [categoryData, setCategoryData] = useState<any[] | null>(null);
  const [categoryLoading, setCategoryLoading] = useState(false);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  
  // Map-related state
  const [tooltip, setTooltip] = useState(null);
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [mapCountryData, setMapCountryData] = useState({});
  const [mapCategoryData, setMapCategoryData] = useState({});
  const [mapLoading, setMapLoading] = useState(false);
  const [mapError, setMapError] = useState(null);
  const [totalApiRequests, setTotalApiRequests] = useState(0);
  
  // Real dapp data state
  const [realDappData, setRealDappData] = useState<any[]>([]);
  const [realDappLoading, setRealDappLoading] = useState(false);
  const [realDappError, setRealDappError] = useState<string | null>(null);
  const [selectedRealDapp, setSelectedRealDapp] = useState<string | null>(null);
  const [realDappActions, setRealDappActions] = useState<any[]>([]);
  const [realDappActionsLoading, setRealDappActionsLoading] = useState(false);
  const [realDappActionsError, setRealDappActionsError] = useState<string | null>(null);

  // Category selection state
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // ── Fastest growing category states ──
  const [fastestGrowingCategory, setFastestGrowingCategory] = useState<string>('');
  const [fastestGrowingPercentage, setFastestGrowingPercentage] = useState<number>(0);

  // ── Fastest growing country states ──
  const [fastestGrowingCountry, setFastestGrowingCountry] = useState<string>('');
  const [fastestGrowingCountryPercentage, setFastestGrowingCountryPercentage] = useState<number>(0);

  // ── Filtering states for growth cards ──
  const [filteredByCategory, setFilteredByCategory] = useState<string>('');
  const [filteredByCountry, setFilteredByCountry] = useState<string>('');

  // ── Baseline API calls states ──
  const [baselineApiCalls, setBaselineApiCalls] = useState<number>(0);
  const [percentChangeCalls, setPercentChangeCalls] = useState<number>(0);

  const router = useRouter();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const selected = sessionStorage.getItem('selected_chain');
      setChain(selected);
      if (!selected) {
        setTimeout(() => router.push('/'), 2000);
      }
    }
  }, [router]);

  useEffect(() => {
    async function fetchData() {
      if (!chain) return;
      setLoading(true);
      setFetchError(null);
      
      try {
        let query = supabase
          .from('aggregated_country_chain_category')
          .select('date, country, chain, category, total_requests, unique_users, tx_volume_usd')
          .ilike('chain', chain)
          .gte('date', startDate)
          .lte('date', endDate);
        
        // If a country is selected, filter by country
        if (selectedCountry) {
          const mappedCountry = getCountryCodeMapping(selectedCountry);
          query = query.ilike('country', mappedCountry);
        }

        // If a category is selected, filter by category
        if (selectedCategory) {
          query = query.ilike('category', selectedCategory);
        }
        
        const { data, error } = await query;
        if (error) {
          setFetchError(error.message);
          setLoading(false);
          return;
        }
        
        // Aggregate data by date (summing across categories and countries)
        const aggregatedData = {};
        if (data && data.length > 0) {
          data.forEach(row => {
            const dateKey = row.date;
            if (!aggregatedData[dateKey]) {
              aggregatedData[dateKey] = {
                date: row.date,
                chain: chain,
                api_calls: 0,
                tx_volume_usd: 0,
                unique_users: 0,
                country: selectedCountry ? getCountryName(selectedCountry) : 'Global',
                category: selectedCategory || 'All Categories'
              };
            }
            aggregatedData[dateKey].api_calls += row.total_requests || 0;
            aggregatedData[dateKey].tx_volume_usd += row.tx_volume_usd || 0;
            aggregatedData[dateKey].unique_users += row.unique_users || 0;
          });
        }
        
        setRawData(Object.values(aggregatedData));
      } catch (err) {
        setFetchError(err.message);
      }
      
      setLoading(false);
    }
    fetchData();
  }, [chain, startDate, endDate, selectedCountry, selectedCategory]);

  // Fetch chart data with country filtering
  useEffect(() => {
    async function fetchChartData() {
      setChartLoading(true);
      setChartError(null);
      
      try {
        let query = supabase
          .from('aggregated_country_chain_category')
          .select('date, total_requests, tx_volume_usd, chain')
          .ilike('chain', chain)
          .gte('date', startDate)
          .lte('date', endDate);
        
        // If a country is selected, filter by country
        if (selectedCountry) {
          const mappedCountry = getCountryCodeMapping(selectedCountry);
          query = query.ilike('country', mappedCountry);
        }

        // If a category is selected, filter by category
        if (selectedCategory) {
          query = query.ilike('category', selectedCategory);
        }
        
        const { data, error } = await query;
        if (error) {
          setChartError(error.message);
          setChartLoading(false);
          return;
        }
        
        // Aggregate data by date (summing across categories and countries)
        const aggregatedData = {};
        if (data && data.length > 0) {
          data.forEach(row => {
            const dateKey = row.date;
            if (!aggregatedData[dateKey]) {
              aggregatedData[dateKey] = {
                date: row.date,
                chain: chain,
                api_calls: 0,
                tx_volume_usd: 0
              };
            }
            aggregatedData[dateKey].api_calls += row.total_requests || 0;
            aggregatedData[dateKey].tx_volume_usd += row.tx_volume_usd || 0;
          });
        }
        
        processChartData(Object.values(aggregatedData));
      } catch (err) {
        setChartError(err instanceof Error ? err.message : 'Unknown error');
      }
      
      setChartLoading(false);
    }
    
    function processChartData(data) {
      // Group data by chain
      const chainSet = new Set<string>();
      const dateSet = new Set<string>();
      if (data) {
        data.forEach((row: any) => {
          chainSet.add(row.chain);
          dateSet.add(row.date);
        });
      }
      const chains = Array.from(chainSet).sort();
      const dates = Array.from(dateSet).sort();
      // Build a map: { chain: { date: api_calls } }
      const chainDateMap: { [chain: string]: { [date: string]: number } } = {};
      if (data) {
        data.forEach((row: any) => {
          if (!chainDateMap[row.chain]) chainDateMap[row.chain] = {};
          chainDateMap[row.chain][row.date] = row.api_calls;
        });
      }
      // Prepare datasets for Chart.js
      const colorPalette = [
        '#3b82f6', // blue
        '#10b981', // green
        '#f59e42', // orange
        '#a855f7', // purple
        '#dc2626', // red
        '#059669', // teal
        '#d97706', // amber
        '#6366f1', // indigo
      ];
      const normalizedChain = chain ? chain.toLowerCase() : '';
      const datasets = chains.map((c, idx) => {
        const color = colorPalette[idx % colorPalette.length];
        const isSelected = c.toLowerCase() === normalizedChain;
        return {
          label: c,
          data: dates.map(date => chainDateMap[c]?.[date] || 0),
          borderColor: color,
          backgroundColor: color,
          borderWidth: isSelected ? 4 : 2,
          pointRadius: isSelected ? 4 : 2,
          tension: 0.3,
          fill: false,
          hidden: false,
        };
      });
      setChartData({ dates, datasets });
    }
    
    fetchChartData();
  }, [chain, startDate, endDate, selectedCountry, selectedCategory]);

  // Fetch country data based on date range and selected country filter
  useEffect(() => {
    async function fetchCountryData() {
      if (!chain) return;
      setCountryLoading(true);
      setCountryError(null);
      
      if (chain.toLowerCase() === 'all') {
        // Special case: fetch data for all chains
        const { data: allChainsData, error: allChainsError } = await supabase
          .from('aggregated_country_chain')
          .select('country, users, chain')
          .gte('date', startDate)
          .lte('date', endDate);
        
        if (allChainsError) {
          setCountryError(allChainsError.message);
          setCountryLoading(false);
          return;
        }
        
        // Aggregate data by country across all chains
        const countryTotals: { [key: string]: number } = {};
        const countryChainTotals: { [country: string]: { [chain: string]: number } } = {};
        
        if (allChainsData) {
          allChainsData.forEach((row: any) => {
            // Sum up users by country
            if (countryTotals[row.country]) {
              countryTotals[row.country] += row.users;
            } else {
              countryTotals[row.country] = row.users;
            }
            
            // Track individual chain data for the comparison table
            if (!countryChainTotals[row.country]) {
              countryChainTotals[row.country] = {};
            }
            if (countryChainTotals[row.country][row.chain]) {
              countryChainTotals[row.country][row.chain] += row.users;
            } else {
              countryChainTotals[row.country][row.chain] = row.users;
            }
          });
        }
        
        // Convert to array and sort by total users
        const aggregatedData = Object.entries(countryTotals)
          .map(([country, users]) => ({ 
            country, 
            users, 
            rank: 0, // No ranking for "all" view
            allChainsData: countryChainTotals[country] || {}
          }))
          .sort((a, b) => b.users - a.users);
        
        setCountryData({ rows: aggregatedData, chains: Array.from(new Set(aggregatedData.map(item => item.country))) });
        setCountryLoading(false);
        return;
      }
      
      // Original logic for specific chain
      // First, get all chains' data for the date range to calculate rankings
      const { data: allChainsData, error: allChainsError } = await supabase
        .from('aggregated_country_chain')
        .select('country, users, chain')
        .gte('date', startDate)
        .lte('date', endDate);
      
      if (allChainsError) {
        setCountryError(allChainsError.message);
        setCountryLoading(false);
        return;
      }
      
      // Calculate rankings across all chains for each country
      const countryChainTotals: { [country: string]: { [chain: string]: number } } = {};
      if (allChainsData) {
        allChainsData.forEach((row: any) => {
          if (!countryChainTotals[row.country]) {
            countryChainTotals[row.country] = {};
          }
          if (countryChainTotals[row.country][row.chain]) {
            countryChainTotals[row.country][row.chain] += row.users;
          } else {
            countryChainTotals[row.country][row.chain] = row.users;
          }
        });
      }
      
      // Calculate rankings for each country
      const countryRankings: { [country: string]: number } = {};
      Object.keys(countryChainTotals).forEach(country => {
        const chainsInCountry = countryChainTotals[country];
        const selectedChainUsers = chainsInCountry[chain] || 0;
        
        // Get all user counts for this country and sort them
        const allUserCounts = Object.values(chainsInCountry).sort((a, b) => b - a);
        
        // Find the rank of the selected chain
        let rank = 1;
        for (let i = 0; i < allUserCounts.length; i++) {
          if (allUserCounts[i] > selectedChainUsers) {
            rank++;
          } else {
            break;
          }
        }
        
        countryRankings[country] = rank;
      });
      
      // Get data for the selected chain only
      const { data, error } = await supabase
        .from('aggregated_country_chain')
        .select('country, users')
        .ilike('chain', chain)
        .gte('date', startDate)
        .lte('date', endDate);
      
      if (error) setCountryError(error.message);
      
      // Aggregate data by country, summing up users for the selected chain only
      const countryTotals: { [key: string]: number } = {};
      if (data) {
        data.forEach((row: any) => {
          if (countryTotals[row.country]) {
            countryTotals[row.country] += row.users;
          } else {
            countryTotals[row.country] = row.users;
          }
        });
      }
      
      // Convert to array and sort by total users, including rankings
      const aggregatedData = Object.entries(countryTotals)
        .map(([country, users]) => {
          // If the country is missing from all-chains data, rank is 1
          let rank = 1;
          let selectedChainUsers = 0;
          if (countryChainTotals[country]) {
            const chainsInCountry = countryChainTotals[country];
            // Case-insensitive match for selected chain
            const normalizedChain = chain.toLowerCase();
            Object.entries(chainsInCountry).forEach(([dbChain, users]) => {
              if (dbChain.toLowerCase() === normalizedChain) {
                selectedChainUsers = users;
              }
            });
            const allUserCounts = Object.values(chainsInCountry).sort((a, b) => b - a);
            rank = 1;
            for (let i = 0; i < allUserCounts.length; i++) {
              if (allUserCounts[i] > selectedChainUsers) {
                rank++;
              } else {
                break;
              }
            }
          }
          return {
          country, 
          users, 
            rank,
          allChainsData: countryChainTotals[country] || {}
          };
        })
        .sort((a, b) => b.users - a.users);
      
      // Filter by selected country if one is selected
      let filteredData = aggregatedData;
      if (selectedCountry) {
        const countryName = getCountryName(selectedCountry);
        filteredData = aggregatedData.filter(item => 
          item.country.toLowerCase() === countryName.toLowerCase() ||
          item.country.toLowerCase() === selectedCountry.toLowerCase()
        );
      }
      
      setCountryData({ rows: filteredData, chains: Array.from(new Set(filteredData.map(item => item.country))) });
      setCountryLoading(false);
    }
    fetchCountryData();
  }, [chain, startDate, endDate, selectedCountry]);

  // Fetch category data based on date range and selected country filter
  useEffect(() => {
    async function fetchCategoryData() {
      if (!chain) return;
      setCategoryLoading(true);
      setCategoryError(null);
      // Debug: log the current date range
      console.log('fetchCategoryData', { startDate, endDate });
      const { data: allChainsData, error: allChainsError } = await supabase
        .from('aggregated_category_chain')
        .select('category, users, chain')
        .gte('date', startDate)
        .lte('date', endDate);
      if (allChainsError) {
        setCategoryError(allChainsError.message);
        setCategoryLoading(false);
        return;
      }
      // Aggregate by category and chain
      const categoryChainTotals: { [category: string]: { [chain: string]: number } } = {};
      if (allChainsData) {
        allChainsData.forEach((row: any) => {
          if (!categoryChainTotals[row.category]) {
            categoryChainTotals[row.category] = {};
          }
          if (categoryChainTotals[row.category][row.chain]) {
            categoryChainTotals[row.category][row.chain] += row.users;
          } else {
            categoryChainTotals[row.category][row.chain] = row.users;
          }
        });
      }
      // Now, for the selected chain, build the categoryData with dynamic ranking
      const categoryDataArr: { category: string, users: number, rank: number }[] = [];
      const normalizedChain = chain.toLowerCase();
      Object.keys(categoryChainTotals).forEach(category => {
        const chains = categoryChainTotals[category];
        // Find the selected chain's users in a case-insensitive way
        let selectedChainUsers = 0;
        Object.entries(chains).forEach(([dbChain, users]) => {
          if (dbChain.toLowerCase() === normalizedChain) {
            selectedChainUsers = users;
          }
        });
        // Build sorted user counts for ranking
        const allUserCounts = Object.values(chains).sort((a: any, b: any) => b - a);
        let rank = 1;
        for (let i = 0; i < allUserCounts.length; i++) {
          if ((allUserCounts[i] as number) > selectedChainUsers) {
            rank++;
          } else {
            break;
          }
        }
        categoryDataArr.push({ category, users: selectedChainUsers, rank });
      });
      categoryDataArr.sort((a, b) => b.users - a.users);
      
      // Filter by selected country if one is selected
      let filteredCategoryData = categoryDataArr;
      if (selectedCountry) {
        // If a country is selected, show only categories that have data for that country
        // This will be handled by the map category data instead
        filteredCategoryData = [];
      }
      
      setCategoryData(filteredCategoryData);
      setCategoryLoading(false);
    }
    fetchCategoryData();
  }, [chain, startDate, endDate, selectedCountry]);

  // whenever either thumb moves, recalc both dates
  useEffect(() => {
    const s = new Date(DATE_START.getTime() + startSliderValue * MS_PER_DAY);
    const e = new Date(DATE_START.getTime() + sliderValue      * MS_PER_DAY);
    const newStartDate = formatDate(s);
    const newEndDate = formatDate(e);
    
    console.log('Date update:', { startSliderValue, sliderValue, newStartDate, newEndDate });
    
    setStartDate(newStartDate);
    setEndDate(newEndDate);
  }, [startSliderValue, sliderValue]);

  // Fetch map country data from Supabase
  useEffect(() => {
    async function fetchMapCountryData() {
      if (!chain) return;
      setMapLoading(true);
      setMapError(null);
      
      try {
        // Fetch aggregated country data for the selected chain and date range
        let query = supabase
          .from('aggregated_country_chain_category')
          .select('country, total_requests, unique_users, tx_volume_usd, date')
          .ilike('chain', chain)
          .gte('date', startDate)
          .lte('date', endDate);

        // If a category is selected, filter by category
        if (selectedCategory) {
          query = query.ilike('category', selectedCategory);
        }
        
        const { data, error } = await query;
        if (error) throw error;
        
        // Aggregate by country
        const countryTotals = {};
        if (data && data.length > 0) {
          data.forEach(row => {
            if (!countryTotals[row.country]) {
              countryTotals[row.country] = {
                total_requests: 0,
                unique_users: 0,
                tx_volume_usd: 0
              };
            }
            countryTotals[row.country].total_requests += row.total_requests || 0;
            countryTotals[row.country].unique_users += row.unique_users || 0;
            countryTotals[row.country].tx_volume_usd += row.tx_volume_usd || 0;
          });
        } else {
          // If no data, let's add some mock data for testing
          countryTotals['US'] = { total_requests: 12345, unique_users: 5000, tx_volume_usd: 1000000 };
          countryTotals['CA'] = { total_requests: 2345, unique_users: 1000, tx_volume_usd: 200000 };
          countryTotals['FR'] = { total_requests: 3456, unique_users: 1500, tx_volume_usd: 300000 };
          countryTotals['GB'] = { total_requests: 4567, unique_users: 2000, tx_volume_usd: 400000 };
          countryTotals['DE'] = { total_requests: 5678, unique_users: 2500, tx_volume_usd: 500000 };
        }
        
        setMapCountryData(countryTotals);
        
        // Calculate total API requests
        const total = Object.values(countryTotals).reduce((sum, val) => sum + (val.total_requests || val), 0);
        setTotalApiRequests(total);
        
      } catch (err) {
        console.error('Error fetching map country data:', err);
        setMapError(err instanceof Error ? err.message : 'Unknown error');
        // Fallback to mock data on error
        const mockData = {
          'US': { total_requests: 12345, unique_users: 5000, tx_volume_usd: 1000000 },
          'CA': { total_requests: 2345, unique_users: 1000, tx_volume_usd: 200000 },
          'FR': { total_requests: 3456, unique_users: 1500, tx_volume_usd: 300000 },
          'GB': { total_requests: 4567, unique_users: 2000, tx_volume_usd: 400000 },
          'DE': { total_requests: 5678, unique_users: 2500, tx_volume_usd: 500000 }
        };
        setMapCountryData(mockData);
        setTotalApiRequests(Object.values(mockData).reduce((sum, val) => sum + val.total_requests, 0));
      } finally {
        setMapLoading(false);
      }
    }
    
    fetchMapCountryData();
  }, [chain, startDate, endDate, selectedCategory]);

  // Fetch map category data for the selected country and chain, or global if no country selected
  useEffect(() => {
    async function fetchMapCategoryData() {
      if (!chain) {
        setMapCategoryData({});
        return;
      }
      
      try {
        if (selectedCountry) {
          // Fetch country-specific category data
          const mappedCountry = getCountryCodeMapping(selectedCountry);
          
          // First, get all chains' category data for this country to calculate rankings
          const { data: allChainsCategoryData, error: allChainsError } = await supabase
            .from('aggregated_country_chain_category')
            .select('*')
            .ilike('country', mappedCountry)
            .gte('date', startDate)
            .lte('date', endDate);
          
          if (allChainsError) throw allChainsError;
          
          // Calculate rankings for each category
          const categoryRankings = {};
          if (allChainsCategoryData && allChainsCategoryData.length > 0) {
            const firstRow = allChainsCategoryData[0];
            const countColumnCandidates = ['total_requests', 'unique_users', 'tx_volume_usd'];
            let countColumn = null;
            
            for (const candidate of countColumnCandidates) {
              if (firstRow.hasOwnProperty(candidate)) {
                countColumn = candidate;
                break;
              }
            }
            
            if (!countColumn) {
              const numericColumns = Object.keys(firstRow).filter(key => 
                typeof firstRow[key] === 'number' && key !== 'date'
              );
              if (numericColumns.length > 0) {
                countColumn = numericColumns[0];
              }
            }
            
            if (countColumn) {
              // Group by category and chain
              const categoryChainTotals = {};
              allChainsCategoryData.forEach(row => {
                if (!categoryChainTotals[row.category]) {
                  categoryChainTotals[row.category] = {};
                }
                if (!categoryChainTotals[row.category][row.chain]) {
                  categoryChainTotals[row.category][row.chain] = 0;
                }
                categoryChainTotals[row.category][row.chain] += row[countColumn] || 0;
              });
              

              
              // Calculate rankings for each category
              Object.keys(categoryChainTotals).forEach(category => {
                const chains = categoryChainTotals[category];
                
                // Find the selected chain with case-insensitive matching
                const selectedChainKey = Object.keys(chains).find(chainKey => 
                  chainKey.toLowerCase() === chain.toLowerCase()
                );
                const selectedChainUsers = selectedChainKey ? chains[selectedChainKey] : 0;
                
                // Get all user counts for this category and sort them
                const allUserCounts = Object.values(chains).sort((a, b) => b - a);
                
                // Find the rank of the selected chain
                let rank = 1;
                for (let i = 0; i < allUserCounts.length; i++) {
                  if (allUserCounts[i] > selectedChainUsers) {
                    rank++;
                  } else {
                    break;
                  }
                }
                
                categoryRankings[category] = rank;
              });
            }
          }
          
          // Fetch data for the selected chain and country
          const { data: categoryChainData, error: categoryError } = await supabase
            .from('aggregated_country_chain_category')
            .select('*')
            .ilike('chain', chain)
            .ilike('country', mappedCountry)
            .gte('date', startDate)
            .lte('date', endDate);
          
          if (categoryError) throw categoryError;
          
          // Aggregate by category with rankings
          const categoryTotals = {};
          if (categoryChainData && categoryChainData.length > 0) {
            const firstRow = categoryChainData[0];
            const countColumnCandidates = ['total_requests', 'unique_users', 'tx_volume_usd'];
            let countColumn = null;
            
            for (const candidate of countColumnCandidates) {
              if (firstRow.hasOwnProperty(candidate)) {
                countColumn = candidate;
                break;
              }
            }
            
            if (!countColumn) {
              const numericColumns = Object.keys(firstRow).filter(key => 
                typeof firstRow[key] === 'number' && key !== 'date'
              );
              if (numericColumns.length > 0) {
                countColumn = numericColumns[0];
              }
            }
            
            if (countColumn) {
              categoryChainData.forEach(row => {
                if (!categoryTotals[row.category]) {
                  categoryTotals[row.category] = { users: 0, rank: categoryRankings[row.category] || 1 };
                }
                categoryTotals[row.category].users += row[countColumn] || 0;
              });
            }
          }
          
          // Ensure all values are properly structured as objects
          const sanitizedCategoryTotals = {};
          Object.keys(categoryTotals).forEach(category => {
            const data = categoryTotals[category];
            if (typeof data === 'object' && data !== null && typeof data.users === 'number') {
              sanitizedCategoryTotals[category] = data;
            } else {
              // Fallback: convert to proper structure
              sanitizedCategoryTotals[category] = { 
                users: typeof data === 'number' ? data : 0, 
                rank: 1 
              };
            }
          });
          
          setMapCategoryData(sanitizedCategoryTotals);
        } else {
          // Fetch global category data for ALL chains to calculate rankings
          const { data: allChainsGlobalData, error: allChainsGlobalError } = await supabase
            .from('aggregated_category_chain')
            .select('*')
            .gte('date', startDate)
            .lte('date', endDate);
          
          if (allChainsGlobalError) throw allChainsGlobalError;
          
          // Calculate rankings for each category across all chains
          const categoryRankings = {};
          if (allChainsGlobalData && allChainsGlobalData.length > 0) {
            const firstRow = allChainsGlobalData[0];
            const countColumnCandidates = ['total_requests', 'unique_users', 'tx_volume_usd'];
            let countColumn = null;
            
            for (const candidate of countColumnCandidates) {
              if (firstRow.hasOwnProperty(candidate)) {
                countColumn = candidate;
                break;
              }
            }
            
            if (!countColumn) {
              const numericColumns = Object.keys(firstRow).filter(key => 
                typeof firstRow[key] === 'number' && key !== 'date'
              );
              if (numericColumns.length > 0) {
                countColumn = numericColumns[0];
              }
            }
            
            if (countColumn) {
              // Group by category and chain
              const categoryChainTotals = {};
              allChainsGlobalData.forEach(row => {
                if (!categoryChainTotals[row.category]) {
                  categoryChainTotals[row.category] = {};
                }
                if (!categoryChainTotals[row.category][row.chain]) {
                  categoryChainTotals[row.category][row.chain] = 0;
                }
                categoryChainTotals[row.category][row.chain] += row[countColumn] || 0;
              });
              
              // Calculate rankings for each category
              Object.keys(categoryChainTotals).forEach(category => {
                const chains = categoryChainTotals[category];
                
                // Find the selected chain with case-insensitive matching
                const selectedChainKey = Object.keys(chains).find(chainKey => 
                  chainKey.toLowerCase() === chain.toLowerCase()
                );
                const selectedChainUsers = selectedChainKey ? chains[selectedChainKey] : 0;
                
                // Get all user counts for this category and sort them
                const allUserCounts = Object.values(chains).sort((a, b) => b - a);
                
                // Find the rank of the selected chain
                let rank = 1;
                for (let i = 0; i < allUserCounts.length; i++) {
                  if (allUserCounts[i] > selectedChainUsers) {
                    rank++;
                  } else {
                    break;
                  }
                }
                
                categoryRankings[category] = rank;
              });
            }
          }
          
          // Fetch global category data for the selected chain
          const { data: globalCategoryData, error: globalError } = await supabase
            .from('aggregated_category_chain')
            .select('*')
            .ilike('chain', chain)
            .gte('date', startDate)
            .lte('date', endDate);
          
          if (globalError) throw globalError;
          
          // Aggregate by category with rankings
          const categoryTotals = {};
          if (globalCategoryData && globalCategoryData.length > 0) {
            globalCategoryData.forEach(row => {
              if (!categoryTotals[row.category]) {
                categoryTotals[row.category] = { users: 0, rank: categoryRankings[row.category] || 1 };
              }
              categoryTotals[row.category].users += row.users || 0;
            });
          }
          
          // Keep the cross-chain rankings that were already calculated above
          // Don't re-rank categories against each other - each category can be #1 for the selected chain
          
          // Ensure all values are properly structured as objects
          const sanitizedCategoryTotals = {};
          Object.keys(categoryTotals).forEach(category => {
            const data = categoryTotals[category];
            if (typeof data === 'object' && data !== null && typeof data.users === 'number') {
              sanitizedCategoryTotals[category] = data;
            } else {
              // Fallback: convert to proper structure
              sanitizedCategoryTotals[category] = { 
                users: typeof data === 'number' ? data : 0, 
                rank: 1 
              };
            }
          });
          
          setMapCategoryData(sanitizedCategoryTotals);
        }
      } catch (err) {
        console.error('Error fetching map category data:', err);
        setMapCategoryData({});
      }
    }
    
    fetchMapCategoryData();
  }, [chain, selectedCountry, startDate, endDate]);

  // Fetch real dapp data from aggregated_country_chain_category_dapps
  useEffect(() => {
    async function fetchRealDappData() {
      if (!chain) return;
      setRealDappLoading(true);
      setRealDappError(null);
      try {
        let query = supabase
          .from('aggregated_country_chain_category_dapps')
          .select('dapp_name, total_requests')
          .ilike('chain', chain)
          .gte('date', startDate)
          .lte('date', endDate);
        
        if (selectedCountry) {
          const mappedCountry = getCountryCodeMapping(selectedCountry);
          query = query.ilike('country', mappedCountry);
        }

        // If a category is selected, filter by category
        if (selectedCategory) {
          query = query.ilike('category', selectedCategory);
        }
        
        const { data, error } = await query;
        if (error) throw error;
        
        // Aggregate by dapp_name (sum total_requests)
        const dappTotals: { [key: string]: number } = {};
        if (data) {
          data.forEach((row: any) => {
            if (dappTotals[row.dapp_name]) {
              dappTotals[row.dapp_name] += row.total_requests || 0;
            } else {
              dappTotals[row.dapp_name] = row.total_requests || 0;
            }
          });
        }
        
        // Convert to array and sort by usage
        const dappArray = Object.entries(dappTotals)
          .map(([dapp_name, total_requests]) => ({ dapp_name, total_requests }))
          .sort((a, b) => b.total_requests - a.total_requests);
        
        setRealDappData(dappArray);
      } catch (err: any) {
        setRealDappError(err.message || 'Unknown error');
      } finally {
        setRealDappLoading(false);
      }
    }
    fetchRealDappData();
  }, [chain, selectedCountry, startDate, endDate, selectedCategory]);

  // Fetch real dapp actions when a real dapp is selected
  useEffect(() => {
    async function fetchRealDappActions() {
      if (!selectedRealDapp) {
        setRealDappActions([]);
        return;
      }
      setRealDappActionsLoading(true);
      setRealDappActionsError(null);
      try {
        let query = supabase
          .from('aggregated_country_chain_category_dapps_actions')
          .select('action_type, total_requests')
          .ilike('dapp_name', selectedRealDapp)
          .ilike('chain', chain)
          .gte('date', startDate)
          .lte('date', endDate);
        if (selectedCountry) {
          const mappedCountry = getCountryCodeMapping(selectedCountry);
          query = query.ilike('country', mappedCountry);
        }
        // If a category is selected, filter by category
        if (selectedCategory) {
          query = query.ilike('category', selectedCategory);
        }
        const { data, error } = await query;
        if (error) throw error;
        // Aggregate by action_type
        const actionTotals: { [key: string]: number } = {};
        if (data) {
          data.forEach((row: any) => {
            if (actionTotals[row.action_type]) {
              actionTotals[row.action_type] += row.total_requests || 0;
            } else {
              actionTotals[row.action_type] = row.total_requests || 0;
            }
          });
        }
        const actionArray = Object.entries(actionTotals)
          .map(([action_type, total_requests]) => ({ action_type, total_requests }))
          .sort((a, b) => b.total_requests - a.total_requests);
        setRealDappActions(actionArray);
      } catch (err: any) {
        setRealDappActionsError(err.message || 'Unknown error');
      } finally {
        setRealDappActionsLoading(false);
      }
    }
    fetchRealDappActions();
  }, [selectedRealDapp, chain, selectedCountry, startDate, endDate, selectedCategory]);

  useEffect(() => {
    if (!chain || !startDate || !endDate) return;
    (async () => {
      // Calculate the prior period dates
      const days = (new Date(endDate).getTime() - new Date(startDate).getTime()) / MS_PER_DAY;
      const prevEnd = new Date(new Date(startDate).getTime() - MS_PER_DAY);
      const prevStart = new Date(prevEnd.getTime() - days * MS_PER_DAY);
      const ps = prevStart.toISOString().slice(0,10);
      const pe = prevEnd  .toISOString().slice(0,10);

      // Validate that we have valid dates before making the query
      if (ps && pe && ps !== 'Invalid Date' && pe !== 'Invalid Date') {
        // 1) Get current period category and country data
        let { data: currData, error: e1 } = await supabase
          .from('aggregated_country_chain_category')
          .select('category, country, total_requests')
          .ilike('chain', chain)
          .gte('date', startDate)
          .lte('date', endDate);

        // 2) Get prior period category and country data
        let { data: prevData, error: e2 } = await supabase
          .from('aggregated_country_chain_category')
          .select('category, country, total_requests')
          .ilike('chain', chain)
          .gte('date', ps)
          .lte('date', pe);

        if (!e1 && !e2 && currData && prevData) {
          // Aggregate by category for both periods (for fastest growing category)
          const currCategoryTotals = {};
          const prevCategoryTotals = {};

          // For category calculation: if a country is selected, only look at categories within that country
          const categoryCurrData = filteredByCountry ? currData.filter(row => row.country === filteredByCountry) : currData;
          const categoryPrevData = filteredByCountry ? prevData.filter(row => row.country === filteredByCountry) : prevData;

          categoryCurrData.forEach(row => {
            currCategoryTotals[row.category] = (currCategoryTotals[row.category] || 0) + (row.total_requests || 0);
          });

          categoryPrevData.forEach(row => {
            prevCategoryTotals[row.category] = (prevCategoryTotals[row.category] || 0) + (row.total_requests || 0);
          });

          // Calculate growth rates for each category
          let fastestCategory = '';
          let fastestGrowth = -Infinity;

          Object.keys(currCategoryTotals).forEach(category => {
            const currTotal = currCategoryTotals[category];
            const prevTotal = prevCategoryTotals[category] || 0;
            
            if (prevTotal > 0) {
              const growthRate = ((currTotal - prevTotal) / prevTotal) * 100;
              if (growthRate > fastestGrowth) {
                fastestGrowth = growthRate;
                fastestCategory = category;
              }
            } else if (currTotal > 0) {
              // If no previous data but current data exists, it's 100% growth
              if (100 > fastestGrowth) {
                fastestGrowth = 100;
                fastestCategory = category;
              }
            }
          });

          setFastestGrowingCategory(fastestCategory);
          setFastestGrowingPercentage(fastestGrowth);

          // Aggregate by country for both periods (for fastest growing country)
          const currCountryTotals = {};
          const prevCountryTotals = {};

          // For country calculation: if a category is selected, only look at countries within that category
          const countryCurrData = filteredByCategory ? currData.filter(row => row.category === filteredByCategory) : currData;
          const countryPrevData = filteredByCategory ? prevData.filter(row => row.category === filteredByCategory) : prevData;

          countryCurrData.forEach(row => {
            if (row.country) {
              currCountryTotals[row.country] = (currCountryTotals[row.country] || 0) + (row.total_requests || 0);
            }
          });

          countryPrevData.forEach(row => {
            if (row.country) {
              prevCountryTotals[row.country] = (prevCountryTotals[row.country] || 0) + (row.total_requests || 0);
            }
          });

          // Calculate growth rates for each country
          let fastestCountry = '';
          let fastestCountryGrowth = -Infinity;

          Object.keys(currCountryTotals).forEach(country => {
            const currTotal = currCountryTotals[country];
            const prevTotal = prevCountryTotals[country] || 0;
            
            if (prevTotal > 0) {
              const growthRate = ((currTotal - prevTotal) / prevTotal) * 100;
              if (growthRate > fastestCountryGrowth) {
                fastestCountryGrowth = growthRate;
                fastestCountry = country;
              }
            } else if (currTotal > 0) {
              // If no previous data but current data exists, it's 100% growth
              if (100 > fastestCountryGrowth) {
                fastestCountryGrowth = 100;
                fastestCountry = country;
              }
            }
          });

          setFastestGrowingCountry(fastestCountry);
          setFastestGrowingCountryPercentage(fastestCountryGrowth);

          console.log('Filtering Debug:', {
            filteredByCategory,
            filteredByCountry,
            fastestCategory,
            fastestCountry,
            categoryTotals: Object.keys(currCategoryTotals),
            countryTotals: Object.keys(currCountryTotals)
          });

          // 3) Baseline API calls - compare current period with immediately preceding period of same length
          const currSum = Object.values(currCategoryTotals).reduce((sum, val) => sum + val, 0);
          const prevSum = Object.values(prevCategoryTotals).reduce((sum, val) => sum + val, 0);
          
          console.log('Comparison Debug:', { currSum, prevSum, startDate, endDate, ps, pe });
          
          setBaselineApiCalls(prevSum);
          const percentageChange = prevSum > 0
            ? ((currSum - prevSum) / prevSum) * 100
            : currSum > 0 ? 100 : 0;
          
          console.log('Percentage calculation:', percentageChange);
          setPercentChangeCalls(percentageChange);
        }
      } else {
        console.log('Invalid date calculation:', { startDate, endDate, ps, pe, days });
      }
    })();
  }, [chain, startDate, endDate, filteredByCategory, filteredByCountry]);

  // Helper function to get API requests for selected country
  const getSelectedCountryApiRequests = () => {
    if (!selectedCountry) return 0;
    
    const mappedCode = getCountryCodeMapping(selectedCountry);
    const countryData = mapCountryData[selectedCountry] || 
                       mapCountryData[mappedCode] || 
                       null;
    
    return countryData ? (typeof countryData === 'object' ? countryData.total_requests : countryData) : 0;
  };

  // Handle country click
  const handleCountryClick = (geo) => {
    const countryCode = geo.properties.ISO_A2 || geo.properties.iso_a2 || geo.properties.ADM0_A3 || geo.id;
    const countryName = geo.properties.NAME_EN || geo.properties.NAME || geo.properties.name || geo.properties.NAME_LONG;
    
    if (countryCode && countryCode !== 'undefined') {
      setSelectedCountry(countryCode);
    }
  };

  return (
    <main style={{ minHeight: '100vh', background: '#f7f7f7', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', padding: '2rem 0', position: 'relative' }}>

      {/* Row 1: Welcome - Full Width */}
      <div style={{ width: '100%', maxWidth: 1400, marginBottom: 20 }}>
        <div style={{ background: '#fff', borderRadius: 16, padding: '2rem 1.5rem', boxShadow: '0 4px 24px rgba(0,0,0,0.07)', width: '100%', textAlign: 'center' }}>
          {chain ? (
            <>
              <h1 style={{ fontSize: '2rem', fontWeight: 700, margin: 0, color: '#2d2d2d' }}>
                Welcome to your Dashboard
              </h1>
              <p style={{ color: '#4a4a4a', marginTop: 16, fontSize: '1.1rem' }}>
                You are viewing data for:
              </p>
              <div style={{ fontSize: '1.5rem', fontWeight: 600, color: '#3b82f6', marginTop: 10 }}>
                {chain.charAt(0).toUpperCase() + chain.slice(1)}
              </div>
            </>
          ) : (
            <>
              <h1 style={{ fontSize: '2rem', fontWeight: 700, margin: 0, color: '#2d2d2d' }}>
                No Chain Selected
              </h1>
              <p style={{ color: '#4a4a4a', marginTop: 16, fontSize: '1.1rem' }}>
                Please return to the landing page and select your chain.
              </p>
            </>
          )}
          <button
            style={{ marginTop: 32, padding: '0.7rem 2rem', fontSize: '1rem', borderRadius: 6, background: '#2d2d2d', color: '#fff', border: 'none', cursor: 'pointer' }}
            onClick={() => router.push('/')}
          >
            Back
          </button>
        </div>
      </div>

      {/* Row 2: Date Range - Full Width */}
      <div style={{ width: '100%', maxWidth: 1400, marginBottom: 20 }}>
        <div style={{ background: '#fff', borderRadius: 16, padding: '1.5rem', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 12, color: '#2d2d2d' }}>Date Range</h2>
          
          {/* quick‐jump buttons */}
          <div style={{ display: 'flex', gap: '1rem', marginBottom: 20 }}>
            <button
              style={{ 
                padding: '0.75rem 1.5rem', 
                borderRadius: 8, 
                background: '#3b82f6', 
                color: '#fff', 
                border: 'none', 
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: 500,
                transition: 'all 0.2s ease',
                boxShadow: '0 2px 4px rgba(59, 130, 246, 0.2)'
              }}
              onMouseEnter={(e) => e.target.style.background = '#2563eb'}
              onMouseLeave={(e) => e.target.style.background = '#3b82f6'}
              onClick={() => { setStartSliderValue(NUM_DAYS - 7); setSliderValue(NUM_DAYS); }}
            >
              Prev 7 Days
            </button>
            <button
              style={{ 
                padding: '0.75rem 1.5rem', 
                borderRadius: 8, 
                background: '#3b82f6', 
                color: '#fff', 
                border: 'none', 
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: 500,
                transition: 'all 0.2s ease',
                boxShadow: '0 2px 4px rgba(59, 130, 246, 0.2)'
              }}
              onMouseEnter={(e) => e.target.style.background = '#2563eb'}
              onMouseLeave={(e) => e.target.style.background = '#3b82f6'}
              onClick={() => { setStartSliderValue(NUM_DAYS - 14); setSliderValue(NUM_DAYS); }}
            >
              Prev 14 Days
            </button>
            <button
              style={{ 
                padding: '0.75rem 1.5rem', 
                borderRadius: 8, 
                background: '#3b82f6', 
                color: '#fff', 
                border: 'none', 
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: 500,
                transition: 'all 0.2s ease',
                boxShadow: '0 2px 4px rgba(59, 130, 246, 0.2)'
              }}
              onMouseEnter={(e) => e.target.style.background = '#2563eb'}
              onMouseLeave={(e) => e.target.style.background = '#3b82f6'}
              onClick={() => { setStartSliderValue(0); setSliderValue(NUM_DAYS); }}
            >
              All Data
            </button>
          </div>

          {/* dual-knob slider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', width: 400 }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '0.8rem', color: '#666', marginBottom: 4, display: 'block' }}>Start</label>
              <input
                type="range"
                min={0}
                max={NUM_DAYS}
                value={startSliderValue}
                onChange={(e) => {
                  const newStart = parseInt(e.target.value);
                  if (newStart < sliderValue) {
                    setStartSliderValue(newStart);
                  }
                }}
                style={{ width: '100%' }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '0.8rem', color: '#666', marginBottom: 4, display: 'block' }}>End</label>
              <input
                type="range"
                min={0}
                max={NUM_DAYS}
                value={sliderValue}
                onChange={(e) => {
                  const newEnd = parseInt(e.target.value);
                  if (newEnd > startSliderValue) {
                    setSliderValue(newEnd);
                  }
                }}
                style={{ width: '100%' }}
              />
            </div>
          </div>
          
          <div style={{ marginTop: 10, fontSize: '0.95rem', color: '#444' }}>
            {startDate} to {endDate}
          </div>
        </div>
      </div>

      {/* Row 3: Growth & Baseline Cards */}
      <div style={{ width: '100%', maxWidth: 1400, display: 'flex', gap: 20, marginBottom: 20 }}>
        {/* Fastest Growing Category Card */}
        <div 
          style={{ 
            flex: 1, 
            background: filteredByCountry ? '#f0f9ff' : '#fff', 
            borderRadius: 16, 
            padding: '1.5rem', 
            boxShadow: '0 2px 12px rgba(0,0,0,0.06)', 
            textAlign: 'center',
            cursor: 'pointer',
            border: filteredByCountry ? '2px solid #3b82f6' : '2px solid transparent',
            transition: 'all 0.2s ease'
          }}
          onClick={() => {
            if (fastestGrowingCategory) {
              setFilteredByCategory(fastestGrowingCategory);
              setFilteredByCountry(''); // Clear country filter when selecting category
            }
          }}
        >
          <h2 style={{ fontSize: '1.3rem', fontWeight: 600, marginBottom: 12 }}>
            Fastest Growing Category
            {filteredByCountry && <span style={{ fontSize: '0.9rem', color: '#3b82f6', marginLeft: 8 }}>(filtered by {getCountryName(filteredByCountry)})</span>}
          </h2>
          <div style={{ fontSize: '2.5rem', fontWeight: 700, color: '#8b5cf6', margin: '16px 0' }}>
            {fastestGrowingCategory || 'N/A'}
          </div>
          <div style={{ color: fastestGrowingPercentage >= 0 ? '#10b981' : '#dc2626', fontSize: '1.1rem', fontWeight: 600 }}>
            {fastestGrowingPercentage >= 0 ? '+' : ''}{fastestGrowingPercentage.toFixed(1)}% growth
          </div>
          <div style={{ color: '#6b7280', fontSize: '1rem', marginTop: 4 }}>
            vs. prior period
          </div>
          {filteredByCountry && (
            <button
              style={{
                marginTop: 8,
                padding: '0.3rem 0.8rem',
                fontSize: '0.8rem',
                borderRadius: 4,
                background: '#ef4444',
                color: '#fff',
                border: 'none',
                cursor: 'pointer'
              }}
              onClick={(e) => {
                e.stopPropagation();
                setFilteredByCountry('');
              }}
            >
              Clear Filter
            </button>
          )}
        </div>

        {/* Fastest Growing Country Card */}
        <div 
          style={{ 
            flex: 1, 
            background: filteredByCategory ? '#fef3c7' : '#fff', 
            borderRadius: 16, 
            padding: '1.5rem', 
            boxShadow: '0 2px 12px rgba(0,0,0,0.06)', 
            textAlign: 'center',
            cursor: 'pointer',
            border: filteredByCategory ? '2px solid #f59e0b' : '2px solid transparent',
            transition: 'all 0.2s ease'
          }}
          onClick={() => {
            if (fastestGrowingCountry) {
              setFilteredByCountry(fastestGrowingCountry);
              setFilteredByCategory(''); // Clear category filter when selecting country
            }
          }}
        >
          <h2 style={{ fontSize: '1.3rem', fontWeight: 600, marginBottom: 12 }}>
            Fastest Growing Country
            {filteredByCategory && <span style={{ fontSize: '0.9rem', color: '#f59e0b', marginLeft: 8 }}>(filtered by {filteredByCategory})</span>}
          </h2>
          <div style={{ fontSize: '2.5rem', fontWeight: 700, color: '#f59e0b', margin: '16px 0' }}>
            {fastestGrowingCountry ? getCountryName(fastestGrowingCountry) : 'N/A'}
          </div>
          <div style={{ color: fastestGrowingCountryPercentage >= 0 ? '#10b981' : '#dc2626', fontSize: '1.1rem', fontWeight: 600 }}>
            {fastestGrowingCountryPercentage >= 0 ? '+' : ''}{fastestGrowingCountryPercentage.toFixed(1)}% growth
          </div>
          <div style={{ color: '#6b7280', fontSize: '1rem', marginTop: 4 }}>
            vs. prior period
          </div>
          {filteredByCategory && (
            <button
              style={{
                marginTop: 8,
                padding: '0.3rem 0.8rem',
                fontSize: '0.8rem',
                borderRadius: 4,
                background: '#ef4444',
                color: '#fff',
                border: 'none',
                cursor: 'pointer'
              }}
              onClick={(e) => {
                e.stopPropagation();
                setFilteredByCategory('');
              }}
            >
              Clear Filter
            </button>
          )}
        </div>

        {/* Historical Baseline Card */}
        <div style={{ flex: 1, background: '#fff', borderRadius: 16, padding: '1.5rem', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', textAlign: 'center' }}>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 600, marginBottom: 12 }}>Calls vs. Prior Period</h2>
          <div style={{ fontSize: '2.5rem', fontWeight: 700, color: '#3b82f6', margin: '16px 0' }}>
            {((rawData || []).reduce((sum, r) => sum + (r.api_calls||0), 0)).toLocaleString()}
          </div>
          <div style={{ color: percentChangeCalls >= 0 ? '#10b981' : '#dc2626', fontSize: '1.1rem', fontWeight: 600 }}>
            {percentChangeCalls >= 0 ? '+' : ''}{percentChangeCalls.toFixed(1)}%
          </div>
          <div style={{ color: '#6b7280', fontSize: '1rem', marginTop: 4 }}>
            vs. {baselineApiCalls.toLocaleString()} calls prior
          </div>
        </div>
      </div>

      {/* Row 4: World Map - no changes */}
      <div style={{ width: '100%', maxWidth: 1400, marginBottom: 20 }}>
        <div style={{ background: '#fff', borderRadius: 16, padding: '2rem', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#2d2d2d' }}>
              World Map - {selectedCountry ? `${getCountryName(selectedCountry)}` : 'Global View'}
            </h2>
            {selectedCountry && (
              <button
                style={{ 
                  padding: '0.5rem 1rem', 
                  fontSize: '0.9rem', 
                  borderRadius: 6, 
                  background: '#e5e7eb', 
                  color: '#2d2d2d', 
                  border: 'none', 
                  cursor: 'pointer' 
                }}
                onClick={() => setSelectedCountry(null)}
              >
                Clear Selection
              </button>
            )}
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem', alignItems: 'start' }}>
            {/* Map Container */}
            <div style={{ 
              background: '#e5e7eb', 
              borderRadius: 16, 
              overflow: 'hidden', 
              position: 'relative', 
              boxShadow: '0 4px 24px rgba(0,0,0,0.07)',
              height: 500
            }}>
              <ComposableMap
                projectionConfig={{ scale: 150 }}
                width={800}
                height={500}
                style={{ width: '100%', height: '100%' }}
              >
                <Geographies geography={geoUrl}>
                  {({ geographies }) => {
                    return geographies.map(geo => {
                      const iso = geo.properties.ISO_A2 || geo.properties.iso_a2 || geo.properties.ADM0_A3 || geo.id;
                      const iso3 = geo.properties.ISO_A3 || geo.properties.iso_a3;
                      const countryName = geo.properties.NAME_EN || geo.properties.NAME || geo.properties.name || geo.properties.NAME_LONG;
                      
                      let apiRequests = 0;
                      
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
                      
                      const countryData = mapCountryData[iso] || mapCountryData[iso3] || mapCountryData[countryName] || 
                                         (countryMapping[iso] ? mapCountryData[countryMapping[iso]] : null);
                      apiRequests = countryData ? (typeof countryData === 'object' ? countryData.total_requests : countryData) : 0;
                      
                      // Calculate global chain ranking for the selected chain
                      let globalChainRank = null;
                      if (apiRequests > 0) {
                        // For now, let's use a simple approach based on the selected chain
                        // In a real implementation, you'd want to fetch global chain totals from the database
                        if (chain.toLowerCase() === 'ethereum') {
                          globalChainRank = 1; // Ethereum is typically #1
                        } else if (chain.toLowerCase() === 'arbitrum') {
                          globalChainRank = 2; // Arbitrum is typically #2
                        } else if (chain.toLowerCase() === 'polygon') {
                          globalChainRank = 3; // Polygon is typically #3
                        } else if (chain.toLowerCase() === 'optimism') {
                          globalChainRank = 4; // Optimism is typically #4
                        } else if (chain.toLowerCase() === 'bsc') {
                          globalChainRank = 5; // BSC is typically #5
                        } else {
                          globalChainRank = 1; // Default to #1 for unknown chains
                        }
                      }
                      const isSelected = selectedCountry === iso;
                      const hasData = apiRequests > 0;
                      
                      // Find the maximum API requests value for color scaling
                      const maxApiRequests = Math.max(...Object.values(mapCountryData).map(val => 
                        typeof val === 'object' ? val.total_requests : val
                      ));
                      
                      // Calculate color intensity based on API requests
                      let fillColor = '#e5e7eb'; // Default gray for no data
                      if (apiRequests > 0) {
                        if (isSelected) {
                          fillColor = '#10b981'; // Green for selected country
                        } else {
                          // Use square root scaling for more continuous color distribution
                          const normalizedValue = Math.sqrt(apiRequests) / Math.sqrt(maxApiRequests);
                          const intensity = Math.max(0.2, Math.min(1, normalizedValue)); // Min 0.2 for visibility
                          
                          // Create a more continuous blue range (lighter to darker)
                          const blueValue = Math.floor(150 + (105 * intensity)); // 150 to 255 (light blue to dark blue)
                          fillColor = `rgb(59, 130, ${blueValue})`;
                        }
                      }
                      
                      return (
                        <Geography
                          key={geo.rsmKey}
                          geography={geo}
                          onClick={() => handleCountryClick(geo)}
                          onMouseEnter={e => {
                            setTooltip({
                              iso,
                              name: countryName,
                              x: e.clientX,
                              y: e.clientY,
                              apiRequests,
                              globalChainRank,
                            });
                          }}
                          onMouseMove={e => {
                            if (tooltip) {
                              setTooltip(prev => ({ ...prev, x: e.clientX, y: e.clientY }));
                            }
                          }}
                          onMouseLeave={() => {
                            setTooltip(null);
                          }}
                          style={{
                            default: { 
                              fill: fillColor,
                              outline: 'none', 
                              stroke: '#fff', 
                              strokeWidth: 0.5,
                              cursor: 'pointer'
                            },
                            hover: { 
                              fill: isSelected ? '#059669' : (apiRequests > 0 ? '#2563eb' : '#d1d5db'), 
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
              
              {/* Tooltip */}
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
                  <div style={{ color: '#3b82f6', fontWeight: 600, marginBottom: 4 }}>
                    API Requests: {tooltip.apiRequests.toLocaleString()}
                    {selectedCategory && ` (${selectedCategory})`}
                  </div>
                  {tooltip.globalChainRank && (
                    <div style={{ 
                      color: tooltip.globalChainRank === 1 ? '#059669' : tooltip.globalChainRank === 2 ? '#d97706' : tooltip.globalChainRank === 3 ? '#dc2626' : '#6b7280', 
                      fontWeight: 600,
                      marginBottom: 6,
                      fontSize: '0.9rem'
                    }}>
                      Rank: #{tooltip.globalChainRank} globally
                    </div>
                  )}
                  <div style={{ color: '#6b7280', fontSize: '0.9rem' }}>
                    Click to see category breakdown
                  </div>
                </div>
              )}
            </div>
            
            {/* Category Breakdown Sidebar */}
            <div style={{ 
              background: '#f8fafc',
              borderRadius: 12,
              padding: '1.5rem',
              border: '1px solid #e2e8f0',
              height: 500,
              display: 'flex',
              flexDirection: 'column'
            }}>
              <h3 style={{ 
                fontSize: '1.2rem', 
                fontWeight: 600, 
                marginBottom: '1rem', 
                color: '#2d2d2d' 
              }}>
                {selectedCountry ? `Categories in ${getCountryName(selectedCountry)}` : 'Global Categories'}
              </h3>
              <p style={{ 
                fontSize: '0.9rem', 
                color: '#6b7280', 
                marginBottom: '1rem' 
              }}>
                {selectedCountry 
                  ? `${chain} chain category breakdown for ${getCountryName(selectedCountry)} in the selected date range`
                  : `${chain} chain global category breakdown in the selected date range`
                }
              </p>
              
              {Object.keys(mapCategoryData).length > 0 ? (
                <>
                  <div style={{ flex: 1, overflowY: 'auto', marginBottom: '1rem' }}>
                    {Object.entries(mapCategoryData)
                      .sort(([a], [b]) => a.localeCompare(b)) // Sort alphabetically by category name
                      .map(([category, data]) => {
                        const users = typeof data === 'object' ? data.users : data;
                        const rank = typeof data === 'object' ? data.rank : null;
                        console.log('Category data:', category, data, 'rank:', rank);
                        const isSelected = selectedCategory === category;
                        return (
                          <div key={category} style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: 12,
                            fontSize: '0.95rem',
                            padding: '8px 12px',
                            backgroundColor: isSelected ? '#dbeafe' : '#fff',
                            borderRadius: 8,
                            border: '1px solid #e2e8f0',
                            cursor: 'pointer'
                          }}
                          onClick={() => setSelectedCategory(isSelected ? null : category)}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span style={{ color: '#374151', fontWeight: 500 }}>{category}</span>
                              {rank && (
                                <span style={{
                                  fontSize: '0.8rem',
                                  color: rank === 1 ? '#059669' : rank === 2 ? '#d97706' : rank === 3 ? '#dc2626' : '#6b7280',
                                  fontWeight: 600
                                }}>
                                  Rank: #{rank} in {category}
                                </span>
                              )}
                            </div>
                            <span style={{ fontWeight: 700, color: '#3b82f6' }}>{users.toLocaleString()}</span>
                          </div>
                        );
                      })}
                  </div>
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #e5e7eb', textAlign: 'center' }}>
                    <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                      Total: {Object.values(mapCategoryData).reduce((sum, data) => {
                        const users = typeof data === 'object' ? data.users : data;
                        return sum + users;
                      }, 0).toLocaleString()} API requests
                    </span>
                  </div>
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: '20px', color: '#9ca3af' }}>
                  {selectedCountry 
                    ? `No category data available for ${getCountryName(selectedCountry)}`
                    : 'No global category data available'
                  }
                </div>
              )}
            </div>
          </div>
          
          <div style={{ marginTop: '1rem', color: '#6b7280', fontSize: '0.9rem', textAlign: 'center' }}>
            <b>Interactive Map Instructions:</b> Hover over countries with data to see API request totals. Click on a country to see detailed category breakdown and filter other dashboard cards.
          </div>
        </div>
      </div>

      {/* Row 4: Real Dapp Usage - no changes */}
      {selectedRealDapp ? (
        <div style={{ width: '100%', maxWidth: 1400, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
          {/* Real Dapp Data Card */}
          <div style={{ flex: 1, minWidth: 320, background: '#fff', borderRadius: 16, padding: '1.2rem', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#2d2d2d', marginBottom: '1rem' }}>
              Real Dapp Usage {selectedCountry && `- ${getCountryName(selectedCountry)}`} {selectedCategory && `- ${selectedCategory}`}
            </h3>
            {realDappLoading ? (
              <div>Loading real dapp data...</div>
            ) : realDappError ? (
              <div style={{ color: 'red' }}>Error: {realDappError}</div>
            ) : realDappData.length > 0 ? (
              <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                  <thead style={{ position: 'sticky', top: 0, background: '#f3f4f6' }}>
                    <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: '#2d2d2d', fontSize: '0.9rem' }}>Dapp Name</th>
                      <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: '#2d2d2d', fontSize: '0.9rem' }}>API Requests</th>
                    </tr>
                  </thead>
                  <tbody>
                    {realDappData.map((dapp, index) => (
                      <tr key={dapp.dapp_name} style={{ borderBottom: '1px solid #e5e7eb', cursor: 'pointer', background: selectedRealDapp === dapp.dapp_name ? '#dbeafe' : undefined }} onClick={() => setSelectedRealDapp(dapp.dapp_name)}>
                        <td style={{ padding: '8px 12px', fontSize: '0.9rem', color: '#374151' }}>{dapp.dapp_name}</td>
                        <td style={{ padding: '8px 12px', fontSize: '0.9rem', fontWeight: 600, color: '#3b82f6' }}>{dapp.total_requests.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '20px', color: '#9ca3af' }}>
                No real dapp data found for the selected criteria.
              </div>
            )}
          </div>
          {/* Real Dapp Actions Card */}
          <div style={{ flex: 1, minWidth: 320, background: '#fff', borderRadius: 16, padding: '1.2rem', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#2d2d2d', marginBottom: '1rem' }}>
              Actions for {selectedRealDapp} {selectedCountry && `- ${getCountryName(selectedCountry)}`} {selectedCategory && `- ${selectedCategory}`}
            </h3>
            {realDappActionsLoading ? (
              <div>Loading actions...</div>
            ) : realDappActionsError ? (
              <div style={{ color: 'red' }}>Error: {realDappActionsError}</div>
            ) : realDappActions.length > 0 ? (
              <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: '#2d2d2d', fontSize: '0.9rem' }}>Action</th>
                      <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: '#2d2d2d', fontSize: '0.9rem' }}>API Requests</th>
                    </tr>
                  </thead>
                  <tbody>
                    {realDappActions.map((action, idx) => (
                      <tr key={action.action_type} style={{ borderBottom: '1px solid #e5e7eb' }}>
                        <td style={{ padding: '8px 12px', fontSize: '0.9rem', color: '#374151' }}>{action.action_type}</td>
                        <td style={{ padding: '8px 12px', fontSize: '0.9rem', fontWeight: 600, color: '#3b82f6' }}>{action.total_requests.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '20px', color: '#9ca3af' }}>
                No actions found for {selectedRealDapp}.
              </div>
            )}
          </div>
        </div>
      ) : (
        // Show only the real dapp usage card if no dapp is selected
        <div style={{ width: '100%', maxWidth: 1400, marginBottom: 20 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: '1.5rem', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', width: '100%' }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 600, color: '#2d2d2d', marginBottom: '1rem' }}>
              Real Dapp Usage {selectedCountry && `- ${getCountryName(selectedCountry)}`} {selectedCategory && `- ${selectedCategory}`}
            </h2>
            {realDappLoading ? (
              <div>Loading real dapp data...</div>
            ) : realDappError ? (
              <div style={{ color: 'red' }}>Error: {realDappError}</div>
            ) : realDappData.length > 0 ? (
              <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                  <thead style={{ position: 'sticky', top: 0, background: '#f3f4f6' }}>
                    <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: '#2d2d2d', fontSize: '0.9rem' }}>Dapp Name</th>
                      <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: '#2d2d2d', fontSize: '0.9rem' }}>API Requests</th>
                    </tr>
                  </thead>
                  <tbody>
                    {realDappData.map((dapp, index) => (
                      <tr key={dapp.dapp_name} style={{ borderBottom: '1px solid #e5e7eb', cursor: 'pointer', background: selectedRealDapp === dapp.dapp_name ? '#dbeafe' : undefined }} onClick={() => setSelectedRealDapp(dapp.dapp_name)}>
                        <td style={{ padding: '8px 12px', fontSize: '0.9rem', color: '#374151' }}>{dapp.dapp_name}</td>
                        <td style={{ padding: '8px 12px', fontSize: '0.9rem', fontWeight: 600, color: '#3b82f6' }}>{dapp.total_requests.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '20px', color: '#9ca3af' }}>
                No real dapp data found for the selected criteria.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Row 5: Totals Cards - three equal-width cards */}
      <div style={{ width: '100%', maxWidth: 1400, display: 'flex', gap: 20, marginBottom: 20 }}>

        {/* Total API Requests */}
        <div style={{ flex: 1, background: '#fff', borderRadius: 16, padding: '1.5rem', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', textAlign: 'center' }}>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 600, marginBottom: 12, color: '#2d2d2d' }}>
            Total API Requests {selectedCategory && `- ${selectedCategory}`}
          </h2>
          {(() => {
            // If a country is selected, use the country-specific total from mapCountryData
            if (selectedCountry) {
              const countryName = getCountryName(selectedCountry);
              // Try all possible keys: ISO2, ISO3, country name
              const possibleKeys = [selectedCountry, getCountryCodeMapping(selectedCountry), countryName];
              let countryData = null;
              let foundKey = null;
              for (const key of possibleKeys) {
                if (mapCountryData[key]) {
                  countryData = mapCountryData[key];
                  foundKey = key;
                  break;
                }
              }
              const countryTotal = countryData ? (typeof countryData === 'object' ? countryData.total_requests : countryData) : 0;
              return (
                <>
                  <div style={{ fontSize: '2.5rem', fontWeight: 700, color: '#3b82f6', margin: '16px 0' }}>
                    {countryTotal.toLocaleString()}
                  </div>
                  <div style={{ color: '#059669', fontSize: '1.1rem', fontWeight: 600, marginBottom: 4 }}>
                    For {countryName}
                  </div>
                </>
              );
            } else {
              // Calculate global totals for all chains in the selected date range
              const filtered = rawData && rawData.length > 0 ? rawData.filter(row => row.date >= startDate && row.date <= endDate) : [];
              const chainTotals = {};
              if (filtered.length > 0) {
                filtered.forEach(row => {
                  if (row.chain) {
                    chainTotals[row.chain] = (chainTotals[row.chain] || 0) + (row.api_calls || 0);
                  }
                });
              }
              // Find the chain key in the data that matches the selected chain (case-insensitive)
              let currentChainKey = '';
              if (chain) {
                const found = Object.keys(chainTotals).find(k => k.toLowerCase() === chain.toLowerCase());
                currentChainKey = found || chain;
              }
              const currentTotal = chainTotals[currentChainKey] || 0;
              // Build sorted array for ranking
              const sortedTotals = Object.values(chainTotals).sort((a, b) => b - a);
              let rank = '-';
              if (currentChainKey in chainTotals) {
                if (currentTotal === 0) {
                  // If the selected chain has 0 API calls, rank it at the bottom
                  rank = sortedTotals.length;
                } else {
                  rank = 1 + sortedTotals.filter(val => val > currentTotal).length;
                }
              }
              return (
                <>
                  <div style={{ fontSize: '2.5rem', fontWeight: 700, color: '#3b82f6', margin: '16px 0' }}>
                    {currentTotal.toLocaleString()}
                  </div>
                  <div style={{ color: '#059669', fontSize: '1.1rem', fontWeight: 600, marginBottom: 4 }}>
                    Rank: {rank !== '-' ? `#${rank}` : '-'}
                  </div>
                </>
              );
            }
          })()}
          <div style={{ color: '#6b7280', fontSize: '1rem' }}>
            For the selected date range
          </div>
        </div>

        {/* Total Transaction Volume */}
        <div style={{ flex: 1, background: '#fff', borderRadius: 16, padding: '1.5rem', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', textAlign: 'center' }}>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 600, marginBottom: 12, color: '#2d2d2d' }}>Total Transaction Volume (USD)</h2>
          {(() => {
            if (!rawData || rawData.length === 0) return <div style={{ fontSize: '2.5rem', fontWeight: 700, color: '#10b981', margin: '16px 0' }}>0</div>;
            
            // Calculate total transaction volume for all chains in the selected date range
            const filtered = rawData.filter(row => row.date >= startDate && row.date <= endDate);
            const chainTotals = {};
            if (filtered.length > 0) {
              filtered.forEach(row => {
                if (row.chain) {
                  chainTotals[row.chain] = (chainTotals[row.chain] || 0) + (row.tx_volume_usd || 0);
                }
              });
            }
            
            // Find the chain key in the data that matches the selected chain (case-insensitive)
            let currentChainKey = '';
            if (chain) {
              const found = Object.keys(chainTotals).find(k => k.toLowerCase() === chain.toLowerCase());
              currentChainKey = found || chain;
            }
            const currentTotal = chainTotals[currentChainKey] || 0;
            
            // Build sorted array for ranking
            const sortedTotals = Object.values(chainTotals).sort((a, b) => b - a);
            let rank = '-';
            if (currentChainKey in chainTotals) {
              if (currentTotal === 0) {
                rank = sortedTotals.length;
              } else {
                rank = 1 + sortedTotals.filter(val => val > currentTotal).length;
              }
            }
            
            return (
              <>
                <div style={{ fontSize: '2.5rem', fontWeight: 700, color: '#10b981', margin: '16px 0' }}>
                  ${currentTotal.toLocaleString()}
                </div>
                <div style={{ color: '#059669', fontSize: '1.1rem', fontWeight: 600, marginBottom: 4 }}>
                  Rank: {rank !== '-' ? `#${rank}` : '-'}
                </div>
              </>
            );
          })()}
          <div style={{ color: '#6b7280', fontSize: '1rem' }}>
            For the selected date range
          </div>
        </div>

        {/* Total Unique Users */}
        <div style={{ flex: 1, background: '#fff', borderRadius: 16, padding: '1.5rem', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', textAlign: 'center' }}>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 600, marginBottom: 12, color: '#2d2d2d' }}>Total Unique Users</h2>
          {(() => {
            if (!rawData || rawData.length === 0) return <div style={{ fontSize: '2.5rem', fontWeight: 700, color: '#8b5cf6', margin: '16px 0' }}>0</div>;
            
            // Calculate total unique users for all chains in the selected date range
            const filtered = rawData.filter(row => row.date >= startDate && row.date <= endDate);
            const chainTotals = {};
            if (filtered.length > 0) {
              filtered.forEach(row => {
                if (row.chain) {
                  chainTotals[row.chain] = (chainTotals[row.chain] || 0) + (row.unique_users || 0);
                }
              });
            }
            
            // Find the chain key in the data that matches the selected chain (case-insensitive)
            let currentChainKey = '';
            if (chain) {
              const found = Object.keys(chainTotals).find(k => k.toLowerCase() === chain.toLowerCase());
              currentChainKey = found || chain;
            }
            const currentTotal = chainTotals[currentChainKey] || 0;
            
            // Build sorted array for ranking
            const sortedTotals = Object.values(chainTotals).sort((a, b) => b - a);
            let rank = '-';
            if (currentChainKey in chainTotals) {
              if (currentTotal === 0) {
                rank = sortedTotals.length;
              } else {
                rank = 1 + sortedTotals.filter(val => val > currentTotal).length;
              }
            }
            
            return (
              <>
                <div style={{ fontSize: '2.5rem', fontWeight: 700, color: '#8b5cf6', margin: '16px 0' }}>
                  {currentTotal.toLocaleString()}
                </div>
                <div style={{ color: '#059669', fontSize: '1.1rem', fontWeight: 600, marginBottom: 4 }}>
                  Rank: {rank !== '-' ? `#${rank}` : '-'}
                </div>
              </>
            );
          })()}
          <div style={{ color: '#6b7280', fontSize: '1rem' }}>
            For the selected date range
          </div>
        </div>

      </div>



      {/* Row 5: Charts - side by side */}
      <div style={{ width: '100%', maxWidth: 1400, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        <div>
          {/* API Requests Over Time Chart Card */}
          <div style={{ background: '#fff', borderRadius: 16, padding: '1.5rem', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', width: '100%', textAlign: 'center' }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 600, marginBottom: 12, color: '#2d2d2d' }}>API Requests Over Time</h2>
            {chartLoading ? (
              <div>Loading chart...</div>
            ) : chartError ? (
              <div style={{ color: 'red' }}>Error: {chartError}</div>
            ) : Array.isArray(chartData.datasets) && chartData.datasets.length > 0 ? (
              <Line
                data={{
                  labels: chartData.dates,
                  datasets: chartData.datasets.map(ds => {
                    const isCurrent = chain && ds.label && ds.label.toLowerCase() === chain.toLowerCase();
                    return {
                      ...ds,
                      label: ds.label && !isCurrent ? '???' : ds.label,
                      backgroundColor: isCurrent ? (ds.backgroundColor || 'rgba(59, 130, 246, 0.6)') : 'rgba(156,163,175,0.5)', // grey-400
                      borderColor: isCurrent ? (ds.borderColor || '#3b82f6') : '#9ca3af', // grey-400
                    };
                  }),
                }}
                options={{
                  responsive: true,
                  plugins: {
                    legend: { display: true, position: 'top' },
                                         tooltip: {
                       enabled: true,
                       callbacks: {
                         label: function(context) {
                           const value = context.parsed.y;
                           const dateIdx = context.dataIndex;
                           const allValues = context.chart.data.datasets.map(ds => ds.data[dateIdx]);
                           const currentValue = value;
                           
                           // Calculate actual rank for this specific date
                           let rank = 1;
                           for (let i = 0; i < allValues.length; i++) {
                             if (allValues[i] > currentValue) rank++;
                           }
                           
                           // Only show rank if there are multiple chains with data on this date
                           const validValues = allValues.filter(v => v !== null && v !== undefined && v > 0);
                           if (validValues.length > 1) {
                             return `${context.dataset.label || ''}: ${value.toLocaleString()} (Rank: #${rank})`;
                           } else {
                             return `${context.dataset.label || ''}: ${value.toLocaleString()}`;
                           }
                         }
                       }
                     },
                  },
                  scales: {
                    x: {
                      type: 'time',
                      time: { unit: 'day' },
                      title: { display: true, text: 'Date' },
                    },
                    y: {
                      title: { display: true, text: 'API Requests' },
                      beginAtZero: true,
                    },
                  },
                }}
              />
            ) : (
              <div>No chart data found.</div>
            )}
          </div>
        </div>
        <div>
          {/* TX Volume USD Over Time Chart Card */}
          <div style={{ background: '#fff', borderRadius: 16, padding: '1.5rem', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', width: '100%', textAlign: 'center' }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 600, marginBottom: 12, color: '#2d2d2d' }}>TX Volume (USD) Over Time</h2>
            {(() => {
              if (!rawData || rawData.length === 0) return <div>No TX volume data found.</div>;
              // Aggregate tx_volume_usd by date for all chains
              const volumeByDateByChain = {};
              rawData.forEach(row => {
                if (row.chain && row.tx_volume_usd !== undefined && row.date) {
                  if (!volumeByDateByChain[row.date]) volumeByDateByChain[row.date] = {};
                  if (!volumeByDateByChain[row.date][row.chain]) volumeByDateByChain[row.date][row.chain] = 0;
                  volumeByDateByChain[row.date][row.chain] += row.tx_volume_usd;
                }
              });
              // Only show the selected chain's data, but for ranking, compare to all chains
              const sortedDates = Object.keys(volumeByDateByChain).sort();
              const selectedChain = chain ? chain.toLowerCase() : '';
              const selectedChainData = sortedDates.map(date => {
                // Find the chain key for this date that matches the selected chain (case-insensitive)
                const chainKeys = Object.keys(volumeByDateByChain[date] || {});
                const foundKey = chainKeys.find(k => k.toLowerCase() === selectedChain);
                return foundKey ? volumeByDateByChain[date][foundKey] : 0;
              });
              return sortedDates.length > 0 ? (
                <Bar
                  data={{
                    labels: sortedDates,
                    datasets: [
                      {
                        label: 'TX Volume (USD)',
                        data: selectedChainData,
                        backgroundColor: 'rgba(16, 185, 129, 0.6)',
                        borderColor: '#10b981',
                        borderWidth: 1,
                      },
                    ],
                  }}
                  options={{
                    responsive: true,
                    plugins: {
                      legend: { display: true, position: 'top' },
                                             tooltip: {
                         enabled: true,
                         callbacks: {
                           label: function(context) {
                             const value = context.parsed.y;
                             const dateIdx = context.dataIndex;
                             const allValues = context.chart.data.datasets.map(ds => ds.data[dateIdx]);
                             const currentValue = value;
                             
                             // Calculate actual rank for this specific date
                             let rank = 1;
                             for (let i = 0; i < allValues.length; i++) {
                               if (allValues[i] > currentValue) rank++;
                             }
                             
                             // Only show rank if there are multiple chains with data on this date
                             const validValues = allValues.filter(v => v !== null && v !== undefined && v > 0);
                             if (validValues.length > 1) {
                               return `TX Volume: $${value.toLocaleString()} (Rank: #${rank})`;
                             } else {
                               return `TX Volume: $${value.toLocaleString()}`;
                             }
                           }
                         }
                       },
                    },
                    scales: {
                      x: {
                        type: 'time',
                        time: { unit: 'day' },
                        title: { display: true, text: 'Date' },
                      },
                      y: {
                        title: { display: true, text: 'TX Volume (USD)' },
                        beginAtZero: true,
                      },
                    },
                  }}
                />
              ) : (
                <div>No TX volume data found.</div>
              );
            })()}
          </div>
        </div>
      </div>

    </main>
  );
}