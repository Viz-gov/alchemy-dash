"use client";

import React, { useRef, useState, useCallback, useEffect } from 'react';
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

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

export default function V2Page() {
  const globeRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const animationIdRef = useRef<number | null>(null);

  // Fixed start date: January 1, 2020
  const fixedStartDate = new Date(2020, 0, 1);
  // End date: today's date
  const today = new Date();
  
  const [startDate, setStartDate] = useState(fixedStartDate.toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(today.toISOString().split('T')[0]);

  // Calculate total days for slider
  const totalDays = Math.round((today.getTime() - fixedStartDate.getTime()) / (1000 * 60 * 60 * 24));
  
  // Convert dates to slider values (0 to totalDays)
  const startDays = Math.round((new Date(startDate).getTime() - fixedStartDate.getTime()) / (1000 * 60 * 60 * 24));
  const endDays = Math.round((new Date(endDate).getTime() - fixedStartDate.getTime()) / (1000 * 60 * 60 * 24));

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
    scene.background = new THREE.Color(0x000000);
    sceneRef.current = scene;

    // Camera setup
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 10);
    camera.position.set(4, 0, 0);

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(400, 400);
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

    // World texture and sphere
    const loader = new THREE.TextureLoader();
    const texture = loader.load('/world.jpg');
    const geometry = new THREE.SphereGeometry(1, 64, 32);
    const material = new THREE.MeshBasicMaterial({ map: texture });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.y = Math.PI * -0.5; // Look at Europe initially
    scene.add(mesh);

    // Atmosphere effect
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
        "gl_FragColor = vec4( 1.0, 1.0, 1.0, 1.0 ) * intensity;",
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
    };
  }, []);

  return (
    <div className="min-h-screen bg-black">
      {/* Animated background */}
      <div className="absolute inset-0 bg-gradient-to-br from-black via-gray-900 to-purple-900/20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(120,119,198,0.1),transparent_50%)]"></div>
      </div>
      
      <div className="relative container mx-auto px-4 py-16">
        <div className="max-w-6xl mx-auto text-center">
          {/* Main heading with glow effect */}
          <div className="mb-12">
            <h1 className="text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-purple-500 to-purple-600 mb-4 drop-shadow-[0_0_20px_rgba(168,85,247,0.5)]">
              V2
            </h1>
            <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
              Experience the future of our application with cutting-edge design and enhanced capabilities
            </p>
          </div>

          {/* Date Range Component */}
          <div className="mb-20">
            <div className="bg-gray-900/60 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-8 max-w-2xl mx-auto">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-white">Date Range</h3>
                <div className="flex items-center space-x-3">
                  <button className="p-2 text-gray-400 hover:text-purple-400 transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                    </svg>
                  </button>
                  <button className="p-2 text-gray-400 hover:text-purple-400 transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                    </svg>
                  </button>
                  <button className="p-2 text-gray-400 hover:text-purple-400 transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Date Input Fields */}
              <div className="flex items-center justify-between mb-8">
                <div className="relative">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    min={fixedStartDate.toISOString().split('T')[0]}
                    max={endDate}
                    className="bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all"
                  />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                </div>
                
                <div className="text-gray-400">to</div>
                
                <div className="relative">
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    min={startDate}
                    max={today.toISOString().split('T')[0]}
                    className="bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all"
                  />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Range Slider */}
              <div className="mb-6 flex justify-center">
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
              <div className="text-center text-sm text-gray-400">
                Range: {Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24))} days
              </div>
            </div>
          </div>

          {/* 3D Globe Card */}
          <div className="mb-20">
            <div className="bg-gray-900/60 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-8 max-w-2xl mx-auto">
              <div className="text-center mb-6">
                <h3 className="text-2xl font-semibold text-white mb-2">Interactive World</h3>
                <p className="text-gray-400">Explore our beautiful planet in 3D</p>
              </div>
              
              {/* Globe Container */}
              <div className="flex justify-center">
                <div 
                  ref={globeRef} 
                  className="w-96 h-96 rounded-xl overflow-hidden border border-gray-700/50"
                ></div>
              </div>
              
              <div className="text-center mt-4 text-sm text-gray-500">
                Drag to rotate • Scroll to zoom • Auto-rotating
              </div>
            </div>
          </div>
          
          {/* Futuristic cards grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mt-20">
            {/* Card 1 - Lightning Fast */}
            <div className="group relative">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-500"></div>
              <div className="relative bg-gray-900/80 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-8 hover:border-purple-500/50 transition-all duration-300 hover:scale-105">
                <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(168,85,247,0.3)]">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">Lightning Fast</h3>
                <p className="text-gray-400 leading-relaxed">Experience blazing fast performance with our optimized V2 architecture and advanced caching systems.</p>
                <div className="mt-6 pt-4 border-t border-gray-700/50">
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <span>Performance</span>
                    <div className="flex items-center space-x-1">
                      {[...Array(5)].map((_, i) => (
                        <div key={i} className="w-2 h-2 bg-purple-500 rounded-full"></div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Card 2 - Enhanced Features */}
            <div className="group relative">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-500"></div>
              <div className="relative bg-gray-900/80 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-8 hover:border-purple-500/50 transition-all duration-300 hover:scale-105">
                <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(236,72,153,0.3)]">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">Enhanced Features</h3>
                <p className="text-gray-400 leading-relaxed">Discover new AI-powered capabilities and an intuitive interface designed for the modern user.</p>
                <div className="mt-6 pt-4 border-t border-gray-700/50">
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <span>Innovation</span>
                    <div className="flex items-center space-x-1">
                      {[...Array(5)].map((_, i) => (
                        <div key={i} className="w-2 h-2 bg-pink-500 rounded-full"></div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Card 3 - Next Gen Security */}
            <div className="group relative md:col-span-2 lg:col-span-1">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-cyan-500/20 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-500"></div>
              <div className="relative bg-gray-900/80 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-8 hover:border-purple-500/50 transition-all duration-300 hover:scale-105">
                <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-cyan-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(34,211,238,0.3)]">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">Next Gen Security</h3>
                <p className="text-gray-400 leading-relaxed">Advanced encryption and biometric authentication for enterprise-grade security.</p>
                <div className="mt-6 pt-4 border-t border-gray-700/50">
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <span>Protection</span>
                    <div className="flex items-center space-x-1">
                      {[...Array(5)].map((_, i) => (
                        <div key={i} className="w-2 h-2 bg-cyan-500 rounded-full"></div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* CTA Section */}
          <div className="mt-20">
            <button className="group relative px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl text-white font-semibold text-lg overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-[0_0_40px_rgba(168,85,247,0.5)]">
              <span className="relative z-10">Launch V2 Experience</span>
              <div className="absolute inset-0 bg-gradient-to-r from-purple-700 to-blue-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </button>
            <p className="text-gray-500 mt-4 text-sm">Ready to explore the future?</p>
          </div>
        </div>
      </div>
    </div>
  );
}
