"use client";

import React, { useRef, useState, useCallback, useEffect } from 'react';
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  TimeScale,
  Title,
  Tooltip,
  Legend,
  Filler,
  ArcElement,
} from 'chart.js';
import { Chart } from 'react-chartjs-2';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  TimeScale,
  Title,
  Tooltip,
  Legend,
  Filler,
  ArcElement
);

type RangeSliderProps = {
  min?: number;
  max?: number;
  step?: number;
  defaultLeft?: number;
  defaultRight?: number;
  onChange?: (left: number, right: number) => void;
  minGap?: number;
};

function RangeSlider({
  min = 0,
  max = 100,
  step = 1,
  defaultLeft = 20,
  defaultRight = 80,
  onChange,
  minGap = 0,
}: RangeSliderProps) {
  // Clamp helpers
  const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
  const snap = (v: number) => Math.round(v / step) * step;

  const [left, setLeft] = useState(() => clamp(snap(defaultLeft), min, max));
  const [right, setRight] = useState(() => clamp(snap(defaultRight), min, max));
  const trackRef = useRef<HTMLDivElement | null>(null);
  const activeThumb = useRef<"left" | "right" | null>(null);

  // Notify parent
  useEffect(() => { onChange?.(left, right); }, [left, right, onChange]);

  // Convert clientX → value
  const clientXToValue = useCallback((clientX: number) => {
    const track = trackRef.current!;
    const rect = track.getBoundingClientRect();
    const ratio = (clientX - rect.left) / rect.width;
    const raw = min + ratio * (max - min);
    return snap(clamp(raw, min, max));
  }, [min, max, step]);

  // Pointer move handler
  const handlePointerMove = useCallback((e: PointerEvent) => {
    if (!activeThumb.current) return;
    const v = clientXToValue(e.clientX);

    if (activeThumb.current === "left") {
      // left cannot go below min, or cross (right - minGap)
      const next = clamp(v, min, right - minGap);
      setLeft(next);
    } else {
      // right cannot go above max, or cross (left + minGap)
      const next = clamp(v, left + minGap, max);
      setRight(next);
    }
  }, [clientXToValue, left, right, min, max, minGap]);

  const stopDragging = useCallback(() => {
    activeThumb.current = null;
    window.removeEventListener("pointermove", handlePointerMove);
    window.removeEventListener("pointerup", stopDragging);
  }, [handlePointerMove]);

  const startDragging = (which: "left" | "right") => (e: React.PointerEvent) => {
    activeThumb.current = which;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("pointerup", stopDragging, { passive: true });
  };

  // Keyboard support
  const onKeyDown = (which: "left" | "right") => (e: React.KeyboardEvent) => {
    const delta = (dir: number, big = false) => dir * (big ? step * 10 : step);
    let next = which === "left" ? left : right;

    switch (e.key) {
      case "ArrowLeft": next -= delta(1); break;
      case "ArrowRight": next += delta(1); break;
      case "PageDown": next -= delta(1, true); break;
      case "PageUp":   next += delta(1, true); break;
      case "Home":     next = which === "left" ? min : left + minGap; break;
      case "End":      next = which === "right" ? max : right - minGap; break;
      default: return;
    }
    e.preventDefault();

    next = snap(next);
    if (which === "left") {
      setLeft(clamp(next, min, right - minGap));
    } else {
      setRight(clamp(next, left + minGap, max));
    }
  };

  // Percent positions for styling
  const pct = (v: number) => ((v - min) / (max - min)) * 100;
  const leftPct = pct(left);
  const rightPct = pct(right);

  return (
    <div className="range-slider">
      <div className="track" ref={trackRef} onPointerDown={(e) => {
        // Clicking the track moves the nearest thumb
        const v = clientXToValue(e.clientX);
        if (Math.abs(v - left) <= Math.abs(v - right)) {
          setLeft(clamp(v, min, right - minGap));
        } else {
          setRight(clamp(v, left + minGap, max));
        }
      }}>
        <div
          className="range"
          style={{ left: `${leftPct}%`, width: `${rightPct - leftPct}%` }}
        />
        {/* Left thumb */}
        <button
          className="thumb"
          style={{ left: `${leftPct}%` }}
          role="slider"
          aria-label="Minimum value"
          aria-valuemin={min}
          aria-valuemax={right - minGap}
          aria-valuenow={left}
          aria-orientation="horizontal"
          onPointerDown={startDragging("left")}
          onKeyDown={onKeyDown("left")}
        />
        {/* Right thumb */}
        <button
          className="thumb"
          style={{ left: `${rightPct}%` }}
          role="slider"
          aria-label="Maximum value"
          aria-valuemin={left + minGap}
          aria-valuemax={max}
          aria-valuenow={right}
          aria-orientation="horizontal"
          onPointerDown={startDragging("right")}
          onKeyDown={onKeyDown("right")}
        />
      </div>

      {/* Styles */}
      <style jsx>{`
        .range-slider {
          width: 100%;
          max-width: 520px;
          padding: 16px 6px;
          user-select: none;
        }
        .track {
          position: relative;
          height: 6px;
          border-radius: 999px;
          background: #374151;
        }
        .range {
          position: absolute;
          height: 100%;
          background: linear-gradient(90deg, #8b5cf6, #3b82f6);
          border-radius: 999px;
        }
        .thumb {
          position: absolute;
          top: 50%;
          transform: translate(-50%, -50%);
          width: 20px;
          height: 20px;
          border-radius: 50%;
          border: 2px solid white;
          background: #111827;
          box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
          touch-action: none;
          cursor: grab;
          transition: all 0.2s ease;
        }
        .thumb:hover {
          transform: translate(-50%, -50%) scale(1.1);
          box-shadow: 0 6px 16px rgba(139, 92, 246, 0.4);
        }
        .thumb:active { 
          cursor: grabbing; 
          transform: translate(-50%, -50%) scale(1.05);
        }
        .thumb:focus-visible {
          outline: 3px solid rgba(139, 92, 246, 0.6);
          outline-offset: 2px;
        }
      `}</style>
    </div>
  );
}

// Analytics Cards Component
const AnalyticsCards = ({ data }: { data: any }) => {
  return (
    <div className="grid grid-cols-4 gap-6">
      {/* ————— Card 1 ————— */}
      <div className="bg-gray-900/60 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-sm font-medium text-gray-300">TOTAL REQUESTS</h3>
          <div className="flex items-center text-green-400 text-sm">
            <span className="mr-1">▲</span>
            +12.4%
          </div>
        </div>
        <div className="text-3xl font-bold text-white mb-4">{data.totalRequests.toLocaleString()}</div>
        <div className="h-16">
          <Chart
            type="line"
            data={{
              labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
              datasets: [{
                label: 'Requests',
                data: [2100, 2350, 2800, 2500, 2900, 2700, data.totalRequests / 7],
                borderColor: '#8b5cf6',
                backgroundColor: 'rgba(139, 92, 246, 0.1)',
                borderWidth: 2,
                pointBackgroundColor: 'transparent',
                pointBorderColor: 'transparent',
                pointRadius: 0,
                fill: true,
                tension: 0.4,
              }],
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { display: false } },
              scales: { x: { display: false }, y: { display: false } },
              elements: { point: { radius: 0 } },
            }}
          />
        </div>
      </div>

      {/* ————— Card 2 ————— */}
      <div className="bg-gray-900/60 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-sm font-medium text-gray-300">TX VOLUME</h3>
          <div className="flex items-center text-green-400 text-sm">
            <span className="mr-1">▲</span>
            +8.7%
          </div>
        </div>
        <div className="text-3xl font-bold text-white mb-4">${(data.txVolume / 1000).toFixed(1)}K</div>
        <div className="h-16">
          <Chart
            type="line"
            data={{
              labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
              datasets: [{
                label: 'Volume',
                data: [820, 835, 845, 840, 850, 848, data.txVolume / 1000],
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                borderWidth: 2,
                pointBackgroundColor: 'transparent',
                pointBorderColor: 'transparent',
                pointRadius: 0,
                fill: true,
                tension: 0.4,
              }],
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { display: false } },
              scales: { x: { display: false }, y: { display: false } },
              elements: { point: { radius: 0 } },
            }}
          />
        </div>
      </div>

      {/* ————— Card 3 ————— */}
      <div className="bg-gray-900/60 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-sm font-medium text-gray-300">UNIQUE USERS</h3>
          <div className="flex items-center text-green-400 text-sm">
            <span className="mr-1">▲</span>
            +15.3%
          </div>
        </div>
        <div className="text-3xl font-bold text-white mb-4">{data.uniqueUsers.toLocaleString()}</div>
        <div className="h-16">
          <Chart
            type="line"
            data={{
              labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
              datasets: [{
                label: 'Users',
                data: [800, 820, 840, 830, 850, 845, data.uniqueUsers],
                borderColor: '#f59e0b',
                backgroundColor: 'rgba(245, 158, 11, 0.1)',
                borderWidth: 2,
                pointBackgroundColor: 'transparent',
                pointBorderColor: 'transparent',
                pointRadius: 0,
                fill: true,
                tension: 0.4,
              }],
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { display: false } },
              scales: { x: { display: false }, y: { display: false } },
              elements: { point: { radius: 0 } },
            }}
          />
        </div>
      </div>

      {/* ————— Card 4 ————— */}
      <div className="bg-gray-900/60 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-sm font-medium text-gray-300">TOTAL DAPPS</h3>
          <div className="flex items-center text-green-400 text-sm">
            <span className="mr-1">▲</span>
            +3.2%
          </div>
        </div>
        <div className="text-3xl font-bold text-white mb-4">{data.totalDapps}</div>
        <div className="h-16">
          <Chart
            type="line"
            data={{
              labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
              datasets: [{
                label: 'DApps',
                data: [91, 92, 93, 93, 94, 94, data.totalDapps],
                borderColor: '#06b6d4',
                backgroundColor: 'rgba(6, 182, 212, 0.1)',
                borderWidth: 2,
                pointBackgroundColor: 'transparent',
                pointBorderColor: 'transparent',
                pointRadius: 0,
                fill: true,
                tension: 0.4,
              }],
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { display: false } },
              scales: { x: { display: false }, y: { display: false } },
              elements: { point: { radius: 0 } },
            }}
          />
        </div>
      </div>

      {/* ————— Card 5 ————— */}
      <div className="bg-gray-900/60 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-sm font-medium text-gray-300">REQUEST ERRORS</h3>
          <div className="flex items-center text-red-400 text-sm">
            <span className="mr-1">▼</span>
            -1.8%
          </div>
        </div>
        <div className="text-3xl font-bold text-white mb-4">{data.requestErrors.toLocaleString()}</div>
        <div className="h-16">
          <Chart
            type="line"
            data={{
              labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
              datasets: [{
                label: 'Errors',
                data: [1250, 1248, 1245, 1243, 1240, 1242, data.requestErrors],
                borderColor: '#ef4444',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                borderWidth: 2,
                pointBackgroundColor: 'transparent',
                pointBorderColor: 'transparent',
                pointRadius: 0,
                fill: true,
                tension: 0.4,
              }],
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { display: false } },
              scales: { x: { display: false }, y: { display: false } },
              elements: { point: { radius: 0 } },
            }}
          />
        </div>
      </div>

      {/* ————— Card 6 ————— */}
      <div className="bg-gray-900/60 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-sm font-medium text-gray-300">ACTIVE CHAINS</h3>
          <div className="flex items-center text-green-400 text-sm">
            <span className="mr-1">▲</span>
            +5.9%
          </div>
        </div>
        <div className="text-3xl font-bold text-white mb-4">{data.activeChains}</div>
        <div className="h-16">
          <Chart
            type="line"
            data={{
              labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
              datasets: [{
                label: 'Chains',
                data: [11, 11, 12, 12, 12, 12, data.activeChains],
                borderColor: '#8b5cf6',
                backgroundColor: 'rgba(139, 92, 246, 0.1)',
                borderWidth: 2,
                pointBackgroundColor: 'transparent',
                pointBorderColor: 'transparent',
                pointRadius: 0,
                fill: true,
                tension: 0.4,
              }],
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { display: false } },
              scales: { x: { display: false }, y: { display: false } },
              elements: { point: { radius: 0 } },
            }}
          />
        </div>
      </div>

      {/* ————— Card 7 ————— */}
      <div className="bg-gray-900/60 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-sm font-medium text-gray-300">SUCCESS RATE</h3>
          <div className="flex items-center text-green-400 text-sm">
            <span className="mr-1">▲</span>
            +2.7%
          </div>
        </div>
        <div className="text-3xl font-bold text-white mb-4">{data.successRate}%</div>
        <div className="h-16">
          <Chart
            type="line"
            data={{
              labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
              datasets: [{
                label: 'Success Rate',
                data: [94.5, 94.8, 95.0, 95.1, 95.3, 95.2, data.successRate],
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                borderWidth: 2,
                pointBackgroundColor: 'transparent',
                pointBorderColor: 'transparent',
                pointRadius: 0,
                fill: true,
                tension: 0.4,
              }],
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { display: false } },
              scales: { x: { display: false }, y: { display: false } },
              elements: { point: { radius: 0 } },
            }}
          />
        </div>
      </div>

      {/* ————— Card 8 ————— */}
      <div className="bg-gray-900/60 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-sm font-medium text-gray-300">AVG RESPONSE</h3>
          <div className="flex items-center text-green-400 text-sm">
            <span className="mr-1">▲</span>
            +8.1%
          </div>
        </div>
        <div className="text-3xl font-bold text-white mb-4">{data.avgResponse}ms</div>
        <div className="h-16">
          <Chart
            type="line"
            data={{
              labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
              datasets: [{
                label: 'Response Time',
                data: [270, 265, 260, 255, 250, 248, data.avgResponse],
                borderColor: '#f43f5e',
                backgroundColor: 'rgba(244, 63, 94, 0.1)',
                borderWidth: 2,
                pointBackgroundColor: 'transparent',
                pointBorderColor: 'transparent',
                pointRadius: 0,
                fill: true,
                tension: 0.4,
              }],
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { display: false } },
              scales: { x: { display: false }, y: { display: false } },
              elements: { point: { radius: 0 } },
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default function V2Page() {
  const globeRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const animationIdRef = useRef<number | null>(null);

  // State for analytics data
  const [analyticsData, setAnalyticsData] = useState({
    totalRequests: 0,
    txVolume: 0,
    uniqueUsers: 0,
    totalDapps: 0,
    requestErrors: 0,
    activeChains: 0,
    successRate: 0,
    avgResponse: 0
  });

  // State for selected country and category data
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [countryCategoryData, setCountryCategoryData] = useState<{[key: string]: any}>({});
  const [countryDappData, setCountryDappData] = useState<Array<{
    dapp_id: number;
    dapp_name: string;
    category: string;
    chains: string[];
    total_requests: number;
    unique_users: number;
  }>>([]);
  
  // State for hover tooltip
  const [hoverTooltip, setHoverTooltip] = useState<{
    visible: boolean;
    countryCode: string;
    countryName: string;
    totalRequests: number;
    x: number;
    y: number;
  }>({
    visible: false,
    countryCode: '',
    countryName: '',
    totalRequests: 0,
    x: 0,
    y: 0
  });

  // Fixed start date: June 1, 2025
  const fixedStartDate = new Date(2025, 5, 1);
  // End date: today's date
  const today = new Date();
  
  const [startDate, setStartDate] = useState(fixedStartDate.toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(today.toISOString().split('T')[0]);

  // Calculate total days for slider
  const totalDays = Math.round((today.getTime() - fixedStartDate.getTime()) / (1000 * 60 * 60 * 24));
  
  // Convert dates to slider values (0 to totalDays)
  const startDays = Math.round((new Date(startDate).getTime() - fixedStartDate.getTime()) / (1000 * 60 * 60 * 24));
  const endDays = Math.round((new Date(endDate).getTime() - fixedStartDate.getTime()) / (1000 * 60 * 60 * 24));

  // Fetch real analytics data from Supabase
  const fetchAnalyticsData = useCallback(async (start: string, end: string) => {
    try {
      // Get total requests
      const { data: requestsData, error: requestsError } = await supabase
        .from('aggregated_country_chain_category')
        .select('total_requests')
        .gte('date', start)
        .lte('date', end);

      if (requestsError) throw requestsError;

      // Get transaction volume
      const { data: volumeData, error: volumeError } = await supabase
        .from('aggregated_country_chain_category')
        .select('tx_volume_usd')
        .gte('date', start)
        .lte('date', end);

      if (volumeError) throw volumeError;

      // Get unique users
      const { data: usersData, error: usersError } = await supabase
        .from('aggregated_country_chain_category')
        .select('unique_users')
        .gte('date', start)
        .lte('date', end);

      if (usersError) throw usersError;

      // Get unique dapps
      const { data: dappsData, error: dappsError } = await supabase
        .from('aggregated_country_chain_category')
        .select('category')
        .gte('date', start)
        .lte('date', end);

      if (dappsError) throw dappsError;

      // Get unique chains
      const { data: chainsData, error: chainsError } = await supabase
        .from('aggregated_country_chain_category')
        .select('chain')
        .gte('date', start)
        .lte('date', end);

      if (chainsError) throw chainsError;

      // Calculate totals
      const totalRequests = requestsData?.reduce((sum, row) => sum + (row.total_requests || 0), 0) || 0;
      const totalVolume = volumeData?.reduce((sum, row) => sum + (row.tx_volume_usd || 0), 0) || 0;
      const totalUsers = usersData?.reduce((sum, row) => sum + (row.unique_users || 0), 0) || 0;
      
      // Count unique values
      const uniqueDapps = new Set(dappsData?.map(row => row.category)).size;
      const uniqueChains = new Set(chainsData?.map(row => row.chain)).size;

      // Calculate success rate (assuming 95% success rate for now)
      const successRate = 95;

      // Calculate average response time (assuming 250ms for now)
      const avgResponse = 250;

      // Calculate request errors (assuming 5% error rate)
      const requestErrors = Math.round(totalRequests * 0.05);

      setAnalyticsData({
        totalRequests,
        txVolume: totalVolume,
        uniqueUsers: totalUsers,
        totalDapps: uniqueDapps,
        requestErrors,
        activeChains: uniqueChains,
        successRate,
        avgResponse
      });
    } catch (error) {
      console.error('Error fetching analytics data:', error);
      // Fallback to mock data if there's an error
      const mockData = {
        totalRequests: Math.floor(Math.random() * 20000) + 15000,
        txVolume: Math.floor(Math.random() * 500000) + 500000,
        uniqueUsers: Math.floor(Math.random() * 5000) + 5000,
        totalDapps: Math.floor(Math.random() * 20) + 80,
        requestErrors: Math.floor(Math.random() * 1000) + 1000,
        activeChains: Math.floor(Math.random() * 5) + 10,
        successRate: Math.floor(Math.random() * 5) + 92,
        avgResponse: Math.floor(Math.random() * 100) + 200
      };
      setAnalyticsData(mockData);
    }
  }, []);

  // Fetch country category data when a country is selected
  const fetchCountryCategoryData = useCallback(async (countryCode: string) => {
    try {
      const { data, error } = await supabase
        .from('aggregated_country_chain_category')
        .select('*')
        .ilike('country', countryCode)
        .gte('date', startDate)
        .lte('date', endDate);

      if (error) throw error;

      // Aggregate by category
      const categoryTotals: {[key: string]: { requests: number; volume: number; users: number } } = {};
      
      if (data && data.length > 0) {
        data.forEach(row => {
          if (!categoryTotals[row.category]) {
            categoryTotals[row.category] = { requests: 0, volume: 0, users: 0 };
          }
          categoryTotals[row.category].requests += row.total_requests || 0;
          categoryTotals[row.category].volume += row.tx_volume_usd || 0;
          categoryTotals[row.category].users += row.unique_users || 0;
        });
      }

      setCountryCategoryData(categoryTotals);
    } catch (error) {
      console.error('Error fetching country category data:', error);
      setCountryCategoryData({});
    }
  }, [startDate, endDate]);

  // Fetch country dapp data when a country is selected
  const fetchCountryDappData = useCallback(async (countryCode: string) => {
    try {
      const { data, error } = await supabase
        .from('aggregated_country_chain_category_dapps')
        .select('*')
        .ilike('country', countryCode)
        .gte('date', startDate)
        .lte('date', endDate);

      if (error) throw error;

      // Aggregate dapp data to avoid duplicates
      const dappAggregated: { [key: string]: {
        dapp_id: number;
        dapp_name: string;
        category: string;
        chains: string[];
        total_requests: number;
        unique_users: number;
      }} = {};

      if (data && data.length > 0) {
        data.forEach(row => {
          const key = `${row.dapp_name}-${row.category}`;
          
          if (!dappAggregated[key]) {
            dappAggregated[key] = {
              dapp_id: row.dapp_id,
              dapp_name: row.dapp_name,
              category: row.category,
              chains: [],
              total_requests: 0,
              unique_users: 0
            };
          }
          
          dappAggregated[key].total_requests += row.total_requests || 0;
          dappAggregated[key].unique_users += row.unique_users || 0;
          
          if (!dappAggregated[key].chains.includes(row.chain)) {
            dappAggregated[key].chains.push(row.chain);
          }
        });
      }

      // Convert to array and sort by total requests
      const aggregatedArray = Object.values(dappAggregated)
        .sort((a, b) => b.total_requests - a.total_requests)
        .slice(0, 30); // Limit to top 30 dapps

      setCountryDappData(aggregatedArray);
    } catch (error) {
      console.error('Error fetching country dapp data:', error);
      setCountryDappData([]);
    }
  }, [startDate, endDate]);

  // Helper function to get country name from country code
  const getCountryName = (countryCode: string): string => {
    const countryNames: { [key: string]: string } = {
      'ES': 'Spain',
      'IN': 'India', 
      'CA': 'Canada',
      'DE': 'Germany',
      'FR': 'France',
      'GB': 'United Kingdom',
      'BR': 'Brazil',
      'CN': 'China',
      'AU': 'Australia'
    };
    return countryNames[countryCode] || countryCode;
  };

  // Handle country click on globe
  const handleCountryClick = (countryCode: string) => {
    setSelectedCountry(countryCode);
    fetchCountryCategoryData(countryCode);
    fetchCountryDappData(countryCode);
  };

  // Handle mouse move for hover tooltip
  const handleMouseMove = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (!globeRef.current) return;
    
    const rect = globeRef.current.getBoundingClientRect();
    const mouseX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const mouseY = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    // Check if we're hovering over the globe
    if (mouseX >= -1 && mouseX <= 1 && mouseY >= -1 && mouseY <= 1) {
      // For now, show a simple tooltip based on mouse position
      // In a full implementation, you'd use Three.js raycaster here
      const countryCode = getCountryFromMousePosition(mouseX, mouseY);
      
      if (countryCode) {
        const countryName = getCountryName(countryCode);
        const totalRequests = Math.floor(Math.random() * 1000) + 100; // Placeholder
        
        console.log(`Hover detected: ${countryCode} (${countryName}) at coordinates (${mouseX.toFixed(2)}, ${mouseY.toFixed(2)})`);
        
        setHoverTooltip({
          visible: true,
          countryCode,
          countryName,
          totalRequests,
          x: event.clientX,
          y: event.clientY
        });
      } else {
        console.log(`No country detected at coordinates (${mouseX.toFixed(2)}, ${mouseY.toFixed(2)})`);
        setHoverTooltip(prev => ({ ...prev, visible: false }));
      }
    } else {
      setHoverTooltip(prev => ({ ...prev, visible: false }));
    }
  }, []);

  // Helper function to get country from mouse position (simplified)
  const getCountryFromMousePosition = (mouseX: number, mouseY: number): string | null => {
    // Convert mouse coordinates to approximate country detection
    // This is a simplified approach - in reality you'd use proper 3D raycaster
    
    // Top hemisphere (Northern countries)
    if (mouseY > 0.3) {
      if (mouseX > -0.4 && mouseX < 0.4) return 'GB'; // UK - center top
      if (mouseX > -0.3 && mouseX < 0.3 && mouseY > 0.4) return 'FR'; // France - center top
      if (mouseX > 0.0 && mouseX < 0.5 && mouseY > 0.3) return 'DE'; // Germany - right center
      if (mouseX > -0.5 && mouseX < -0.2 && mouseY > 0.3) return 'ES'; // Spain - left center
      if (mouseX > -0.8 && mouseX < -0.4 && mouseY > 0.2) return 'CA'; // Canada - far left
    }
    
    // Middle band (equatorial countries)
    if (mouseY > -0.2 && mouseY < 0.4) {
      if (mouseX > 0.6 && mouseX < 1.0) return 'IN'; // India - far right
      if (mouseX > 0.7 && mouseX < 1.0 && mouseY > 0.0) return 'CN'; // China - right
      if (mouseX > -0.6 && mouseX < -0.2 && mouseY > -0.1) return 'BR'; // Brazil - left
    }
    
    // Bottom hemisphere (Southern countries)
    if (mouseY < -0.1) {
      if (mouseX > 0.7 && mouseX < 1.0) return 'AU'; // Australia - bottom right
    }
    
    return null;
  };

  // Fetch initial data and when dates change
  useEffect(() => {
    if (startDate && endDate) {
      fetchAnalyticsData(startDate, endDate);
    }
  }, [startDate, endDate, fetchAnalyticsData]);

  // Handle slider changes
  const handleSliderChange = (left: number, right: number) => {
    const newStartDate = new Date(fixedStartDate.getTime() + left * 24 * 60 * 60 * 1000);
    const newEndDate = new Date(fixedStartDate.getTime() + right * 24 * 60 * 60 * 1000);
    
    setStartDate(newStartDate.toISOString().split('T')[0]);
    setEndDate(newEndDate.toISOString().split('T')[0]);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' });
  };

  // Initialize 3D Globe
  useEffect(() => {
    if (!globeRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x111827); // Changed from 0x000000 (black) to 0x111827 (gray-900)
    sceneRef.current = scene;

    // Camera setup
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 10);
    camera.position.set(4, 0, 0);

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(globeRef.current.clientWidth, globeRef.current.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    globeRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.enablePan = false;
    controls.minDistance = 1.5;
    controls.maxDistance = 3;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.5;
    controls.update();

    // World texture and sphere (restored working version)
    const loader = new THREE.TextureLoader();
    const texture = loader.load('/world.jpg');
    const geometry = new THREE.SphereGeometry(1, 64, 32);
    const material = new THREE.MeshBasicMaterial({ map: texture });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.y = Math.PI * -0.5; // Look at Europe initially
    scene.add(mesh);

    // Load GeoJSON country data and create country meshes
    const loadCountries = async () => {
      try {
        // Using a public GeoJSON source for world countries
        const response = await fetch('https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson');
        const geoData = await response.json();
        
        // Create country meshes
        geoData.features.forEach((feature: any) => {
          const countryCode = feature.properties.ISO_A2;
          if (countryCode && countryCode !== 'undefined') {
            // Create a simple sphere for each country (we'll enhance this later)
            const countryGeometry = new THREE.SphereGeometry(1.001, 32, 16);
            const countryMaterial = new THREE.MeshBasicMaterial({ 
              color: 0x8b5cf6, 
              transparent: true, 
              opacity: 0.1,
              side: THREE.DoubleSide 
            });
            const countryMesh = new THREE.Mesh(countryGeometry, countryMaterial);
            
            // Store country code in the mesh for identification
            (countryMesh as any).countryCode = countryCode;
            
            // Position based on country coordinates (simplified)
            const coords = getCountryCoordinates(countryCode);
            if (coords) {
              countryMesh.position.set(coords.x, coords.y, coords.z);
            }
            
            scene.add(countryMesh);
          }
        });
      } catch (error) {
        console.error('Error loading GeoJSON:', error);
        // Fallback: create simple country spheres
        createFallbackCountries();
      }
    };

    // Fallback country creation if GeoJSON fails
    const createFallbackCountries = () => {
      const countries = [
        { code: 'ES', lat: 40, lon: -3 },    // Spain
        { code: 'IN', lat: 20, lon: 77 },    // India
        { code: 'CA', lat: 56, lon: -106 },  // Canada
        { code: 'DE', lat: 51, lon: 10 },    // Germany
        { code: 'FR', lat: 46, lon: 2 },     // France
        { code: 'GB', lat: 55, lon: -3 },    // UK
        { code: 'BR', lat: -10, lon: -55 },  // Brazil
        { code: 'CN', lat: 35, lon: 105 },   // China
        { code: 'AU', lat: -25, lon: 135 }   // Australia
      ];

      countries.forEach(country => {
        const countryGeometry = new THREE.SphereGeometry(1.001, 32, 16);
        const countryMaterial = new THREE.MeshBasicMaterial({ 
          color: 0x8b5cf6, 
          transparent: true, 
          opacity: 0.1,
          side: THREE.DoubleSide 
        });
        const countryMesh = new THREE.Mesh(countryGeometry, countryMaterial);
        
        // Store country code
        (countryMesh as any).countryCode = country.code;
        
        // Convert lat/lon to 3D position
        const phi = (90 - country.lat) * (Math.PI / 180);
        const theta = (country.lon + 180) * (Math.PI / 180);
        const x = -(1 * Math.sin(phi) * Math.cos(theta));
        const z = (1 * Math.sin(phi) * Math.sin(theta));
        const y = (1 * Math.cos(phi));
        
        countryMesh.position.set(x, y, z);
        scene.add(countryMesh);
      });
    };

    // Helper function to get country coordinates
    const getCountryCoordinates = (countryCode: string) => {
      const coordinates: { [key: string]: { x: number; y: number; z: number } } = {
        'ES': { x: -0.5, y: 0.7, z: 0.5 },      // Spain
        'IN': { x: 0.8, y: 0.3, z: 0.5 },       // India
        'CA': { x: -0.8, y: 0.6, z: 0.2 },      // Canada
        'DE': { x: 0.2, y: 0.6, z: 0.8 },       // Germany
        'FR': { x: -0.1, y: 0.7, z: 0.7 },      // France
        'GB': { x: -0.2, y: 0.8, z: 0.6 },      // UK
        'BR': { x: -0.6, y: -0.2, z: 0.8 },     // Brazil
        'CN': { x: 0.9, y: 0.4, z: 0.2 },       // China
        'AU': { x: 0.9, y: -0.4, z: 0.2 }       // Australia
      };
      return coordinates[countryCode];
    };

    // Helper function to get total requests for a country
    const getCountryTotalRequests = (countryCode: string) => {
      // Fetch real data from your database
      const fetchCountryRequests = async () => {
        try {
          const { data, error } = await supabase
            .from('aggregated_country_chain_category')
            .select('total_requests')
            .ilike('country', countryCode)
            .gte('date', startDate)
            .lte('date', endDate);
          
          if (error) throw error;
          
          const totalRequests = data?.reduce((sum, row) => sum + (row.total_requests || 0), 0) || 0;
          return totalRequests;
        } catch (error) {
          console.error('Error fetching country requests:', error);
          return 0;
        }
      };
      
      // For now, return a placeholder. In a real implementation, you'd want to cache this data
      // or fetch it asynchronously and update the tooltip
      return Math.floor(Math.random() * 1000) + 100; // Placeholder random value
    };

    // Load countries
    loadCountries();

    // Atmosphere effect (restored)
    const atmosphereShader = {
      uniforms: {},
      vertexShader: [
        "varying vec3 vNormal;",
        "void main() {",
        "vNormal = normalize( normalMatrix * normal );",
        "gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );",
        "}"
      ].join("\n"),
      fragmentShader: [
        "varying vec3 vNormal;",
        "void main() {",
        "float intensity = pow( 0.8 - dot( vNormal, vec3( 0, 0, 1.0 ) ), 12.0 );",
        "gl_FragColor = vec4( 1.0, 1.0, 1.0 ) * intensity;",
        "}"
      ].join("\n")
    };

    const atmosphereGeometry = new THREE.SphereGeometry(1.07, 40, 30);
    const atmosphereMaterial = new THREE.ShaderMaterial({
      uniforms: atmosphereShader.uniforms,
      vertexShader: atmosphereShader.vertexShader,
      fragmentShader: atmosphereShader.fragmentShader,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      transparent: true
    });

    const atmosphereMesh = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
    atmosphereMesh.scale.set(1.1, 1.1, 1.1);
    scene.add(atmosphereMesh);

    // Raycaster for click detection
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    // Click handler for country selection
    const onGlobeClick = (event: MouseEvent) => {
      const rect = globeRef.current!.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      
      // Check intersection with all country meshes first
      const countryMeshes = scene.children.filter(child => (child as any).countryCode);
      const countryIntersects = raycaster.intersectObjects(countryMeshes);
      
      if (countryIntersects.length > 0) {
        const intersect = countryIntersects[0];
        const countryCode = (intersect.object as any).countryCode;
        
        if (countryCode) {
          handleCountryClick(countryCode);
          console.log('Country clicked:', countryCode);
        }
      } else {
        // Fallback: check intersection with main sphere
        const intersects = raycaster.intersectObject(mesh);
        if (intersects.length > 0) {
          const intersect = intersects[0];
          const point = intersect.point;
          
          // Convert 3D point to latitude/longitude
          const lat = Math.asin(point.y) * (180 / Math.PI);
          const lon = Math.atan2(point.x, point.z) * (180 / Math.PI);
          
          // Simple country detection based on coordinates
          const countryCode = getCountryFromCoords(lat, lon);
          
          if (countryCode) {
            handleCountryClick(countryCode);
            console.log('Country detected by coordinates:', countryCode);
          }
        }
      }
    };

    // Simple country detection function
    const getCountryFromCoords = (lat: number, lon: number): string | null => {
      // This is a simplified version - you'll want to use proper GeoJSON country boundaries
      if (lat > 35 && lat < 45 && lon > -10 && lon < 5) return 'ES'; // Spain
      if (lat > 5 && lat < 35 && lon > 70 && lon < 90) return 'IN'; // India
      if (lat > 45 && lat < 70 && lon > -140 && lon < -50) return 'CA'; // Canada
      if (lat > 45 && lat < 55 && lon > 5 && lon < 15) return 'DE'; // Germany
      if (lat > 40 && lat < 50 && lon > -5 && lon < 10) return 'FR'; // France
      if (lat > 50 && lat < 60 && lon > -10 && lon < 5) return 'GB'; // UK
      if (lat > -35 && lat < 5 && lon > -75 && lon < -30) return 'BR'; // Brazil
      if (lat > 20 && lat < 50 && lon > 70 && lon < 140) return 'CN'; // China
      if (lat > -45 && lat < -10 && lon > 110 && lon < 155) return 'AU'; // Australia
      return null;
    };

    // Add event listeners
    globeRef.current.addEventListener('click', onGlobeClick);

    // Animation loop
    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Cleanup
    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
      if (globeRef.current && renderer.domElement) {
        globeRef.current.removeChild(renderer.domElement);
      }
      if (globeRef.current) {
        globeRef.current.removeEventListener('click', onGlobeClick);
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-black">
      {/* Moving text header */}
      <div className="fixed top-0 left-0 right-0 bg-gray-900/90 backdrop-blur-sm border-b border-gray-700/50 z-50 overflow-hidden">
        <div className="animate-scroll whitespace-nowrap text-sm text-gray-300 py-3">
          📊 Chain Dashboard • Real-time blockchain analytics • Live transaction monitoring • Network performance metrics • DeFi protocol insights • Cross-chain data aggregation • API request tracking • User activity patterns • Volume analysis • Error rate monitoring • Response time optimization • Chain health status • Category breakdown • Geographic distribution • Temporal trends • Performance benchmarking
        </div>
      </div>

      {/* Hover tooltip */}
      {hoverTooltip.visible && (
        <div 
          className="fixed z-50 bg-gray-900/95 backdrop-blur-sm border border-purple-500/50 rounded-lg p-3 shadow-2xl pointer-events-none"
          style={{
            left: hoverTooltip.x + 15,
            top: hoverTooltip.y - 15,
            transform: 'translateY(-50%)'
          }}
        >
          <div className="text-white font-semibold text-sm">{hoverTooltip.countryName}</div>
          <div className="text-purple-400 text-xs">{hoverTooltip.countryCode}</div>
          <div className="text-gray-300 text-xs mt-1">
            Total Requests: {hoverTooltip.totalRequests.toLocaleString()}
          </div>
        </div>
      )}

      {/* Animated background */}
      <div className="absolute inset-0 bg-gradient-to-br from-black via-gray-900 to-purple-900/20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(120,119,198,0.1),transparent_50%)]"></div>
      </div>
      
      <div className="relative py-16 pt-24">
        <div className="px-8">
          
          {/* 🔍 wireframe overlay (turn off later) */}
          <div className="pointer-events-none absolute inset-0
                          [background:linear-gradient(to_right,rgba(168,85,247,.12)_1px,transparent_1px),
                                      linear-gradient(to_bottom,rgba(168,85,247,.08)_1px,transparent_1px)]
                          bg-[length:64px_1px,1px_64px]"></div>

          {/* 2-column hero layout */}
          <div className="flex gap-10 items-stretch">
            {/* LEFT: title + subtext + date controls */}
            <aside className="w-[600px] flex-shrink-0 flex flex-col justify-between outline outline-1 outline-purple-500/30 rounded-xl p-2">
              {/* Title and subtext at top */}
              <div className="space-y-6">
                <div>
                  <h1 className="text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-purple-500 to-purple-600 mb-3 drop-shadow-[0_0_20px_rgba(168,85,247,0.5)]">
                    Chain Dashboard
                  </h1>
                  <p className="text-xl text-gray-300 max-w-2xl">
                    Monitor and analyze blockchain networks with real-time data and comprehensive insights
                  </p>
                </div>
              </div>

              {/* Date range card - expanded to full width and positioned at bottom */}
              <div className="bg-gray-900/60 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 w-full">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">Date Range</h3>
                  <div className="flex items-center space-x-2">
                    <button 
                      onClick={() => {
                        const weekAgo = new Date();
                        weekAgo.setDate(weekAgo.getDate() - 7);
                        const newStartDate = weekAgo.toISOString().split('T')[0];
                        const newEndDate = today.toISOString().split('T')[0];
                        setStartDate(newStartDate);
                        setEndDate(newEndDate);
                        
                        // Update slider values
                        const startDays = Math.round((weekAgo.getTime() - fixedStartDate.getTime()) / (1000 * 60 * 60 * 24));
                        const endDays = Math.round((today.getTime() - fixedStartDate.getTime()) / (1000 * 60 * 60 * 24));
                        handleSliderChange(startDays, endDays);
                      }}
                      className="px-3 py-1.5 text-xs bg-gray-800 hover:bg-gray-700 border border-gray-600 hover:border-purple-500 rounded-lg text-gray-300 hover:text-white transition-all"
                    >
                      Past Week
                    </button>
                    <button 
                      onClick={() => {
                        const monthAgo = new Date();
                        monthAgo.setMonth(monthAgo.getMonth() - 1);
                        const newStartDate = monthAgo.toISOString().split('T')[0];
                        const newEndDate = today.toISOString().split('T')[0];
                        setStartDate(newStartDate);
                        setEndDate(newEndDate);
                        
                        // Update slider values
                        const startDays = Math.round((monthAgo.getTime() - fixedStartDate.getTime()) / (1000 * 60 * 60 * 24));
                        const endDays = Math.round((today.getTime() - fixedStartDate.getTime()) / (1000 * 60 * 60 * 24));
                        handleSliderChange(startDays, endDays);
                      }}
                      className="px-3 py-1.5 text-xs bg-gray-800 hover:bg-gray-700 border border-gray-600 hover:border-purple-500 rounded-lg text-xs"
                    >
                      Past Month
                    </button>
                    <button 
                      onClick={() => {
                        const ytd = new Date(today.getFullYear(), 0, 1);
                        const newStartDate = ytd.toISOString().split('T')[0];
                        const newEndDate = today.toISOString().split('T')[0];
                        setStartDate(newStartDate);
                        setEndDate(newEndDate);
                        
                        // Update slider values
                        const startDays = Math.round((ytd.getTime() - fixedStartDate.getTime()) / (1000 * 60 * 60 * 24));
                        const endDays = Math.round((today.getTime() - fixedStartDate.getTime()) / (1000 * 60 * 60 * 24));
                        handleSliderChange(startDays, endDays);
                      }}
                      className="px-3 py-1.5 text-xs bg-gray-800 hover:bg-gray-700 border border-gray-600 hover:border-purple-500 rounded-lg text-gray-300 hover:text-white transition-all"
                    >
                      YTD
                    </button>
                    <button 
                      onClick={() => {
                        const newStartDate = fixedStartDate.toISOString().split('T')[0];
                        const newEndDate = today.toISOString().split('T')[0];
                        setStartDate(newStartDate);
                        setEndDate(newEndDate);
                        
                        // Update slider values
                        const startDays = 0;
                        const endDays = Math.round((today.getTime() - fixedStartDate.getTime()) / (1000 * 60 * 60 * 24));
                        handleSliderChange(startDays, endDays);
                      }}
                      className="px-3 py-1.5 text-xs bg-gray-800 hover:bg-gray-700 border border-gray-600 hover:border-purple-500 rounded-lg text-gray-300 hover:text-white transition-all"
                    >
                      All Time
                    </button>
                  </div>
                </div>

                {/* Date Input Fields */}
                <div className="flex items-center justify-between mb-6">
                  <div className="relative">
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      min={fixedStartDate.toISOString().split('T')[0]}
                      max={endDate}
                      className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all text-sm"
                    />
                  </div>
                  
                  <div className="text-gray-400 text-sm">to</div>
                  
                  <div className="relative">
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      min={startDate}
                      max={today.toISOString().split('T')[0]}
                      className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all text-sm"
                    />
                  </div>
                </div>

                {/* Range Slider */}
                <div className="mb-4 flex justify-start">
                  <RangeSlider
                    min={0}
                    max={totalDays}
                    step={1}
                    defaultLeft={startDays}
                    defaultRight={endDays}
                    onChange={handleSliderChange}
                    minGap={1}
                  />
                </div>
                
                {/* Range info */}
                <div className="text-left text-sm text-gray-400">
                  Range: {Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24))} days
                </div>
              </div>
            </aside>

            {/* RIGHT: the 8 analytics cards */}
            <main className="flex-1 outline outline-1 outline-sky-500/30 rounded-xl p-2">
              <AnalyticsCards data={analyticsData} />
            </main>
          </div>

          {/* BELOW the hero grid: globe or other sections */}
          <div className="mt-16">
            {/* Three column layout: Left Card | Globe | Right Card */}
            <div className="grid gap-8 items-start" style={{ gridTemplateColumns: '600px 1fr 1fr' }}>
              {/* Left Card */}
              <div className="bg-gray-900/60 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-8 outline outline-1 outline-purple-500/30 aspect-square">
                {/* Empty card for now */}
              </div>

              {/* Center Globe */}
              <div className="bg-gray-900/60 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-8 aspect-square outline outline-1 outline-green-500/30">
                <div className="flex justify-center items-center h-full">
                  <div 
                    ref={globeRef} 
                    className="w-full h-full rounded-xl overflow-hidden"
                    onMouseMove={handleMouseMove}
                  />
                </div>
              </div>

              {/* Right card */}
              <div className="bg-gray-900/60 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-8 aspect-square outline outline-1 outline-orange-500/30">
                {selectedCountry ? (
                  <div className="h-full w-full flex flex-col">
                    <h3 className="text-2xl font-bold text-white mb-6">
                      {selectedCountry} Categories
                    </h3>
                    {Object.keys(countryCategoryData).length > 0 ? (
                      <div className="flex-1 overflow-y-auto space-y-4">
                        {Object.entries(countryCategoryData)
                          .sort(([a], [b]) => a.localeCompare(b))
                          .map(([category, data]) => (
                            <div key={category} className="bg-gray-800/60 rounded-lg p-4 border border-gray-600/50">
                              <div className="flex justify-between items-start mb-2">
                                <span className="text-lg font-semibold text-purple-400">{category}</span>
                                <span className="text-sm text-gray-400">#{Object.keys(countryCategoryData).indexOf(category) + 1}</span>
                              </div>
                              <div className="grid grid-cols-3 gap-4 text-sm">
                                <div>
                                  <span className="text-gray-400">Requests:</span>
                                  <div className="text-white font-semibold">{data.requests.toLocaleString()}</div>
                                </div>
                                <div>
                                  <span className="text-gray-400">Volume:</span>
                                  <div className="text-white font-semibold">${(data.volume / 1000).toFixed(1)}K</div>
                                </div>
                                <div>
                                  <span className="text-gray-400">Users:</span>
                                  <div className="text-white font-semibold">{data.users.toLocaleString()}</div>
                                </div>
                              </div>
                            </div>
                          ))}
                        <div className="pt-4 border-t border-gray-600/50 text-center">
                          <span className="text-sm text-gray-400">
                            Total: {Object.values(countryCategoryData).reduce((sum, data) => sum + data.requests, 0).toLocaleString()} requests
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1 flex items-center justify-center">
                        <div className="text-center text-gray-400">
                          No category data available for {selectedCountry}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="h-full w-full flex items-center justify-center">
                    <div className="text-center text-gray-400">
                      <div className="text-4xl mb-4">🌍</div>
                      <div className="text-xl font-medium">Click on a country</div>
                      <div className="text-sm">to see its categories</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* DApps Breakdown Section - Wide end-to-end card */}
          <div className="mt-16 px-8">
            <div className="bg-gray-900/60 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-8 outline outline-1 outline-blue-500/30">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-3xl font-bold text-white mb-2">
                    DApps Breakdown
                    {selectedCountry && (
                      <span className="text-blue-400 ml-3">
                        - {getCountryName(selectedCountry)}
                      </span>
                    )}
                  </h2>
                  <p className="text-gray-400">
                    Individual decentralized applications and their performance metrics
                  </p>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <div className="text-2xl font-bold text-white">
                      {countryDappData.length > 0 
                        ? countryDappData.reduce((sum, dapp) => sum + dapp.unique_users, 0).toLocaleString()
                        : '0'
                      }
                    </div>
                    <div className="text-sm text-gray-400">Total Users</div>
                  </div>
                </div>
              </div>

              {countryDappData.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-600/50">
                        <th className="text-left py-4 px-6 text-sm font-medium text-gray-300">#</th>
                        <th className="text-left py-4 px-6 text-sm font-medium text-gray-300">DApp Name</th>
                        <th className="text-left py-4 px-6 text-sm font-medium text-gray-300">Category</th>
                        <th className="text-left py-4 px-6 text-sm font-medium text-gray-300">Chains</th>
                        <th className="text-right py-4 px-6 text-sm font-medium text-gray-300">Total Requests</th>
                        <th className="text-right py-4 px-6 text-sm font-medium text-gray-300">% of Total</th>
                        <th className="text-right py-4 px-6 text-sm font-medium text-gray-300">Unique Users</th>
                      </tr>
                    </thead>
                    <tbody>
                      {countryDappData.map((dapp, index) => {
                        const totalRequests = countryDappData.reduce((sum, d) => sum + d.total_requests, 0);
                        const percentage = totalRequests > 0 ? ((dapp.total_requests / totalRequests) * 100).toFixed(1) : '0';
                        
                        return (
                          <tr key={dapp.dapp_id} className="border-b border-gray-700/30 hover:bg-gray-800/30 transition-colors">
                            <td className="py-4 px-6 text-sm text-gray-400">{index + 1}</td>
                            <td className="py-4 px-6">
                              <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                                  <span className="text-blue-400 text-sm font-semibold">
                                    {dapp.dapp_name.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                                <div>
                                  <div className="text-white font-medium">{dapp.dapp_name}</div>
                                  <div className="text-xs text-gray-400">ID: {dapp.dapp_id}</div>
                                </div>
                              </div>
                            </td>
                            <td className="py-4 px-6">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-500/20 text-purple-400 border border-purple-500/30">
                                {dapp.category}
                              </span>
                            </td>
                            <td className="py-4 px-6">
                              <div className="flex flex-wrap gap-1">
                                {dapp.chains.map((chain, chainIndex) => (
                                  <span key={chainIndex} className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-700/50 text-gray-300 border border-gray-600/50">
                                    {chain}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="py-4 px-6 text-right">
                              <div className="text-white font-semibold">{dapp.total_requests.toLocaleString()}</div>
                            </td>
                            <td className="py-4 px-6 text-right">
                              <div className="text-blue-400 font-semibold">{percentage}%</div>
                            </td>
                            <td className="py-4 px-6 text-right">
                              <div className="text-green-400 font-semibold">{dapp.unique_users.toLocaleString()}</div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-16">
                  <div className="text-6xl mb-4">⚡</div>
                  <div className="text-xl text-gray-400 mb-2">
                    {selectedCountry 
                      ? `No dapp data available for ${getCountryName(selectedCountry)}`
                      : 'No country selected'
                    }
                  </div>
                  <div className="text-sm text-gray-500">
                    Click on a country on the globe to see its dapp breakdown
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
