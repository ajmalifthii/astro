import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, Download, Share2, Brain, Sparkles, AlertCircle, Database, Wifi, LogOut } from 'lucide-react';
import * as THREE from 'three';
import { useAstroPsyche } from './hooks/useAstroPsyche';
import { useAuth } from './hooks/useAuth';
import { AuthModal } from './components/AuthModal';
import { ConversationalQuestionnaire } from './components/ConversationalQuestionnaire';
import { ThemedDatePicker, ThemedTimePicker } from './components/DateTimePickers';
import { generatePDF, shareReport } from './services/reportService';
import { isDemoMode } from './lib/supabase';
import type { BirthData } from './services/astrologyService';
import type { FinalReport } from './lib/supabase';

// --- 3D Background Component (unchanged) ---
const ThreeBackground = ({ appStep, formStep }) => {
    const mountRef = useRef(null);
    const threeObjects = useRef({});

    useEffect(() => {
        const currentMount = mountRef.current;
        if (!currentMount) return;

        // --- Basic Scene Setup ---
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, currentMount.clientWidth / currentMount.clientHeight, 0.1, 2000);
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        currentMount.appendChild(renderer.domElement);

        // --- Enhanced Lighting Setup ---
        const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
        scene.add(ambientLight);

        const sunLight = new THREE.PointLight(0xffffff, 3.5, 2000);
        sunLight.position.set(0, 0, 0);
        sunLight.castShadow = true;
        sunLight.shadow.mapSize.width = 2048;
        sunLight.shadow.mapSize.height = 2048;
        scene.add(sunLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(50, 50, 50);
        directionalLight.castShadow = true;
        scene.add(directionalLight);

        const fillLight = new THREE.DirectionalLight(0x6666ff, 0.3);
        fillLight.position.set(-50, -50, -50);
        scene.add(fillLight);

        // --- Camera Controls Setup ---
        const cameraTarget = new THREE.Vector3(0, 0, 0);
        const cameraPosition = new THREE.Vector3(0, 40, 100);
        camera.position.copy(cameraPosition);
        camera.lookAt(cameraTarget);

        // --- Texture Loader ---
        const textureLoader = new THREE.TextureLoader();
        const onTextureError = (xhr) => console.error('An error occurred loading a texture.', xhr);

        // --- Sun with Enhanced Material ---
        const sunTexture = textureLoader.load('https://raw.githubusercontent.com/jeromeetienne/threex.planets/master/images/sunmap.jpg', undefined, undefined, onTextureError);
        const sunGeometry = new THREE.SphereGeometry(7, 64, 64);
        const sunMaterial = new THREE.MeshBasicMaterial({ 
            map: sunTexture,
            emissive: 0xffaa00,
            emissiveIntensity: 0.3
        });
        const sun = new THREE.Mesh(sunGeometry, sunMaterial);
        scene.add(sun);

        // --- Enhanced Planet Creation ---
        function createPlanet(size, textureUrl, distance, orbitSpeed, name) {
            const texture = textureLoader.load(textureUrl, undefined, undefined, onTextureError);
            const geometry = new THREE.SphereGeometry(size, 64, 64);
            const material = new THREE.MeshPhongMaterial({ 
                map: texture, 
                shininess: 5,
                specular: 0x111111
            });
            
            const planet = new THREE.Mesh(geometry, material);
            planet.castShadow = true;
            planet.receiveShadow = true;
            
            const orbit = new THREE.Object3D();
            scene.add(orbit);
            planet.position.x = distance;
            orbit.add(planet);
            
            return { mesh: planet, orbit: orbit, orbitSpeed: orbitSpeed, name: name, distance: distance };
        }

        const textureBaseUrl = 'https://raw.githubusercontent.com/jeromeetienne/threex.planets/master/images/';
        
        const planets = [
            createPlanet(1.2, `${textureBaseUrl}venusmap.jpg`, 22, 0.02, 'Venus'),
            createPlanet(1.3, `${textureBaseUrl}earthmap1k.jpg`, 32, 0.01, 'Earth'),
            createPlanet(1.0, `${textureBaseUrl}marsmap1k.jpg`, 45, 0.008, 'Mars'),
            createPlanet(4.0, `${textureBaseUrl}jupitermap.jpg`, 70, 0.004, 'Jupiter'),
            createPlanet(3.5, `${textureBaseUrl}saturnmap.jpg`, 100, 0.002, 'Saturn')
        ];

        // --- Enhanced Stars ---
        const starVertices = [];
        for (let i = 0; i < 15000; i++) {
            const x = (Math.random() - 0.5) * 3000;
            const y = (Math.random() - 0.5) * 3000;
            const z = (Math.random() - 0.5) * 3000;
            starVertices.push(x, y, z);
        }
        const starGeometry = new THREE.BufferGeometry();
        starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
        const starMaterial = new THREE.PointsMaterial({ 
            color: 0xffffff, 
            size: 1.2,
            sizeAttenuation: true
        });
        const stars = new THREE.Points(starGeometry, starMaterial);
        scene.add(stars);

        threeObjects.current = {
            scene, camera, renderer, planets, sun, cameraTarget, cameraPosition,
            isAnimating: false,
            currentTargetIndex: -1,
            orbitAngle: 0,
            isLoading: false
        };

        // --- Enhanced Animation Loop ---
        let animationFrameId;
        const animate = () => {
            animationFrameId = requestAnimationFrame(animate);
            const { 
                isAnimating, currentTargetIndex, planets, sun, camera, 
                cameraTarget, cameraPosition, renderer, scene, orbitAngle,
                isLoading
            } = threeObjects.current;
            
            if (!renderer) return;

            planets.forEach(p => {
                p.orbit.rotation.y += p.orbitSpeed;
                p.mesh.rotation.y += 0.005;
            });
            
            sun.rotation.y += 0.001;

            if (isLoading) {
                const currentPlanet = planets[Math.min(currentTargetIndex, planets.length - 1)];
                if (currentPlanet) {
                    const worldPosition = new THREE.Vector3();
                    currentPlanet.mesh.getWorldPosition(worldPosition);
                    
                    const fastOrbitAngle = Date.now() * 0.01;
                    const orbitRadius = currentPlanet.distance * 0.3;
                    
                    const orbitX = worldPosition.x + Math.cos(fastOrbitAngle) * orbitRadius;
                    const orbitZ = worldPosition.z + Math.sin(fastOrbitAngle) * orbitRadius;
                    const orbitY = worldPosition.y + Math.sin(fastOrbitAngle * 0.5) * 10;
                    
                    camera.position.set(orbitX, orbitY, orbitZ);
                    camera.lookAt(worldPosition);
                }
            } else if (isAnimating) {
                if (currentTargetIndex >= 0 && currentTargetIndex < planets.length) {
                    const targetPlanet = planets[currentTargetIndex];
                    const worldPosition = new THREE.Vector3();
                    targetPlanet.mesh.getWorldPosition(worldPosition);
                    
                    threeObjects.current.orbitAngle += 0.005;
                    const orbitRadius = targetPlanet.mesh.geometry.parameters.radius * 6;
                    const orbitHeight = targetPlanet.mesh.geometry.parameters.radius * 3;
                    
                    const targetCameraPos = new THREE.Vector3(
                        worldPosition.x + Math.cos(threeObjects.current.orbitAngle) * orbitRadius,
                        worldPosition.y + orbitHeight,
                        worldPosition.z + Math.sin(threeObjects.current.orbitAngle) * orbitRadius
                    );
                    
                    camera.position.lerp(targetCameraPos, 0.02);
                    cameraTarget.lerp(worldPosition, 0.02);
                    camera.lookAt(cameraTarget);
                    
                    if (camera.position.distanceTo(targetCameraPos) < 2) {
                        threeObjects.current.isAnimating = false;
                    }
                } else {
                    const defaultPos = new THREE.Vector3(0, 40, 100);
                    const defaultTarget = new THREE.Vector3(0, 0, 0);
                    
                    camera.position.lerp(defaultPos, 0.02);
                    cameraTarget.lerp(defaultTarget, 0.02);
                    camera.lookAt(cameraTarget);
                    
                    if (camera.position.distanceTo(defaultPos) < 2) {
                        threeObjects.current.isAnimating = false;
                    }
                }
            }
            
            renderer.render(scene, camera);
        };
        animate();

        const handleResize = () => {
            if (!threeObjects.current.camera || !threeObjects.current.renderer) return;
            threeObjects.current.camera.aspect = currentMount.clientWidth / currentMount.clientHeight;
            threeObjects.current.camera.updateProjectionMatrix();
            threeObjects.current.renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
        };
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            cancelAnimationFrame(animationFrameId);
            if (currentMount && renderer.domElement) {
                try {
                    currentMount.removeChild(renderer.domElement);
                } catch (e) {
                    // ignore error if element is already removed
                }
            }
            scene.traverse(object => {
                if (object.geometry) object.geometry.dispose();
                if (object.material) {
                    if (Array.isArray(object.material)) {
                        object.material.forEach(material => material.dispose());
                    } else {
                        object.material.dispose();
                    }
                }
            });
            renderer.dispose();
        };
    }, []);

    useEffect(() => {
        const planetSequence = [
            -1, // Landing Page
            0,  // Venus - Form Step 0
            1,  // Earth - Form Step 1 
            2,  // Mars - Form Step 2
            3,  // Jupiter - Conversational Q&A
            4,  // Saturn - Final Report
        ];
        
        let targetIndex = -1;
        
        if (appStep === 1) {
            targetIndex = planetSequence[1 + formStep] ?? -1;
        } else if (appStep > 1) {
            targetIndex = planetSequence[1 + appStep] ?? -1;
        } else {
            targetIndex = planetSequence[appStep] ?? -1;
        }
        
        if (threeObjects.current && threeObjects.current.isAnimating !== undefined) {
            threeObjects.current.isAnimating = true;
            threeObjects.current.currentTargetIndex = targetIndex;
            threeObjects.current.orbitAngle = 0;
        }
    }, [appStep, formStep]);

    useEffect(() => {
        if (threeObjects.current) {
            threeObjects.current.startLoading = () => {
                threeObjects.current.isLoading = true;
            };
            threeObjects.current.stopLoading = () => {
                threeObjects.current.isLoading = false;
            };
        }
    }, []);

    return <div ref={mountRef} className="absolute inset-0 z-0" />;
};

// --- UI COMPONENTS ---
const GlassPanel = ({ children, className = '' }) => (
    <div className={`bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl ${className}`}>
        {children}
    </div>
);

const PrimaryButton = ({ onClick, children, className = '', disabled = false }) => (
    <motion.button
        whileHover={{ scale: 1.05, boxShadow: "0px 0px 20px rgba(192, 132, 252, 0.5)" }}
        whileTap={{ scale: 0.95 }}
        onClick={onClick}
        disabled={disabled}
        className={`px-6 sm:px-8 py-3 bg-purple-500/80 text-white font-bold rounded-full transition-all duration-300 shadow-lg backdrop-blur-sm border border-purple-400/50 text-sm sm:text-base ${className} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
        {children}
    </motion.button>
);

const InputField = ({ value, onChange, name, type = "text", placeholder, icon }) => (
    <div className="relative w-full">
        {icon && <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40">{icon}</div>}
        <input
            type={type}
            name={name}
            placeholder={placeholder}
            value={value}
            onChange={onChange}
            className="w-full bg-black/20 border border-white/20 rounded-lg py-3 pl-12 pr-4 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all duration-300 text-sm sm:text-base"
        />
    </div>
);

// --- CONNECTION STATUS COMPONENT ---
const ConnectionStatus = ({ status, onRetry, isDemo }) => {
    if (status === 'connected' && !isDemo) return null;

    return (
        <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4"
        >
            <div className={`${isDemo ? 'bg-blue-500/90' : 'bg-red-500/90'} backdrop-blur-sm text-white px-3 sm:px-4 py-2 rounded-lg flex items-center gap-2 text-xs sm:text-sm`}>
                {isDemo ? <Database size={16} /> : <AlertCircle size={16} />}
                <span className="hidden sm:inline">
                    {isDemo 
                        ? 'Running in demo mode - data stored locally' 
                        : status === 'checking' 
                            ? 'Checking connection...' 
                            : 'Database connection failed'
                    }
                </span>
                <span className="sm:hidden">
                    {isDemo ? 'Demo mode' : 'Connection failed'}
                </span>
                {status === 'disconnected' && !isDemo && (
                    <button
                        onClick={onRetry}
                        className="ml-2 text-xs bg-white/20 px-2 py-1 rounded hover:bg-white/30 transition-colors"
                    >
                        Retry
                    </button>
                )}
            </div>
        </motion.div>
    );
};

// --- PAGE COMPONENTS ---
const LandingPage = ({ onNext, onShowAuth }) => {
    useEffect(() => {
        const handleKeyPress = (e) => {
            if (e.key === 'Enter') {
                onShowAuth();
            }
        };
        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [onShowAuth]);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 1 }}
            className="h-full w-full flex flex-col items-center justify-center text-center text-white p-4"
        >
            <motion.h1 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5, duration: 1 }}
                className="text-3xl sm:text-4xl md:text-6xl font-thin tracking-wider mb-4 sm:mb-6"
            >
                Astro<span className="font-light text-purple-300">Psyche</span>
            </motion.h1>
            <motion.p 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.8, duration: 1 }}
                className="text-base sm:text-lg md:text-xl text-white/70 mb-8 sm:mb-12 max-w-md px-4"
            >
                "Discover your cosmic blueprint through AI-powered conversation..."
            </motion.p>
            <PrimaryButton onClick={onShowAuth}>
                Begin Your Journey
            </PrimaryButton>
            <p className="text-xs sm:text-sm text-white/40 mt-4">Press Enter to continue</p>
        </motion.div>
    );
};

const BirthDataPage = ({ onNext, formStep, setFormStep, backgroundRef, user }) => {
    const [formData, setFormData] = useState({
        name: user?.user_metadata?.full_name || '',
        dob: '',
        time: '',
        location: null,
        locationInput: ''
    });
    const [loading, setLoading] = useState(false);
    const { createUser, isLoading, error } = useAstroPsyche();

    const nextFormStep = () => setFormStep(prev => prev + 1);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleDateChange = (date: string) => {
        setFormData(prev => ({ ...prev, dob: date }));
    };

    const handleTimeChange = (time: string) => {
        setFormData(prev => ({ ...prev, time: time }));
    };
    
    const handleLocationSelect = () => {
        setFormData(prev => ({ 
            ...prev, 
            location: { 
                name: formData.locationInput || 'Paris, France', 
                lat: 48.8584, 
                lon: 2.2945 
            } 
        }));
        nextFormStep();
    };

    const handleSubmit = async () => {
        setLoading(true);
        if (backgroundRef?.current?.startLoading) {
            backgroundRef.current.startLoading();
        }

        try {
            const birthData: BirthData = {
                name: formData.name,
                birthDate: formData.dob,
                birthTime: formData.time,
                birthPlace: formData.location?.name || 'Unknown',
                latitude: formData.location?.lat || 0,
                longitude: formData.location?.lon || 0,
                timezone: 'UTC'
            };

            await createUser(birthData);
            
            setTimeout(() => {
                if (backgroundRef?.current?.stopLoading) {
                    backgroundRef.current.stopLoading();
                }
                setLoading(false);
                onNext();
            }, 2000);
        } catch (error) {
            console.error('Failed to create user:', error);
            setLoading(false);
            if (backgroundRef?.current?.stopLoading) {
                backgroundRef.current.stopLoading();
            }
        }
    };

    useEffect(() => {
        const handleKeyPress = (e) => {
            if (e.key === 'Enter') {
                if (formStep === 0 && formData.name) nextFormStep();
                else if (formStep === 1 && formData.dob) nextFormStep();
                else if (formStep === 2 && formData.time) nextFormStep();
                else if (formStep === 3 && formData.locationInput) handleLocationSelect();
                else if (formStep === 4) handleSubmit();
            } else if (e.key === 'Backspace' && formStep > 0 && !e.target.matches('input, textarea')) {
                setFormStep(prev => prev - 1);
            }
        };
        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [formStep, formData]);
    
    const motionProps = {
        initial: { opacity: 0, y: 30 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -30 },
        transition: { duration: 0.5, type: 'spring', stiffness: 120 }
    };

    const steps = [
        <motion.div key="name" {...motionProps} className="w-full flex flex-col items-center">
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6 text-center px-4">What's your name?</h2>
            <InputField name="name" placeholder="Your Name" value={formData.name} onChange={handleInputChange} />
            <div className="mt-6 sm:mt-8 flex flex-col items-center">
                <PrimaryButton onClick={nextFormStep} disabled={!formData.name}>Continue</PrimaryButton>
                <p className="text-xs text-white/40 mt-2">Press Enter to continue</p>
            </div>
        </motion.div>,
        <motion.div key="dob" {...motionProps} className="w-full flex flex-col items-center">
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6 text-center px-4">When were you born?</h2>
            <ThemedDatePicker 
                value={formData.dob} 
                onChange={handleDateChange}
                placeholder="Select your birth date"
            />
            <div className="mt-6 sm:mt-8 flex flex-col items-center">
                <PrimaryButton onClick={nextFormStep} disabled={!formData.dob}>Continue</PrimaryButton>
                <p className="text-xs text-white/40 mt-2">Press Enter to continue</p>
            </div>
        </motion.div>,
        <motion.div key="time" {...motionProps} className="w-full flex flex-col items-center">
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6 text-center px-4">What time were you born?</h2>
            <ThemedTimePicker 
                value={formData.time} 
                onChange={handleTimeChange}
                placeholder="Select your birth time"
            />
            <div className="mt-6 sm:mt-8 flex flex-col items-center">
                <PrimaryButton onClick={nextFormStep} disabled={!formData.time}>Continue</PrimaryButton>
                <p className="text-xs text-white/40 mt-2">Press Enter to continue</p>
            </div>
        </motion.div>,
        <motion.div key="location" {...motionProps} className="w-full flex flex-col items-center">
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6 text-center px-4">Where were you born?</h2>
            <InputField name="locationInput" placeholder="City, Country" value={formData.locationInput} onChange={handleInputChange} />
            <div className="mt-6 sm:mt-8 flex flex-col items-center">
                <PrimaryButton onClick={handleLocationSelect} disabled={!formData.locationInput}>Continue</PrimaryButton>
                <p className="text-xs text-white/40 mt-2">Press Enter to continue</p>
            </div>
        </motion.div>,
        <motion.div key="confirm" {...motionProps} className="w-full flex flex-col items-center">
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6 text-center px-4">Ready to begin?</h2>
            <div className="text-center mb-4 sm:mb-6 px-4">
                <p className="text-white/80 text-sm sm:text-base">Name: {formData.name}</p>
                <p className="text-white/80 text-sm sm:text-base">Born: {formData.dob} at {formData.time}</p>
                <p className="text-white/80 text-sm sm:text-base">Location: {formData.location?.name}</p>
            </div>
            <div className="mt-6 sm:mt-8 flex flex-col items-center">
                <PrimaryButton onClick={handleSubmit} disabled={loading || isLoading}>
                    {loading || isLoading ? 'Creating Profile...' : 'Start Conversation'}
                </PrimaryButton>
                <p className="text-xs text-white/40 mt-2">Press Enter to continue</p>
            </div>
            {error && (
                <div className="mt-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg mx-4">
                    <p className="text-red-300 text-sm">{error}</p>
                </div>
            )}
        </motion.div>
    ];

    if (loading || isLoading) {
        return (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full w-full flex flex-col items-center justify-center text-white p-4">
                <Sparkles className="animate-spin mb-4" size={48} />
                <p className="mt-8 text-lg text-white/80 text-center">Setting up your cosmic profile...</p>
                <p className="text-sm text-white/60 mt-2 text-center">Calculating astrological chart</p>
                {error && (
                    <div className="mt-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg max-w-md mx-4">
                        <p className="text-red-300 text-sm">{error}</p>
                    </div>
                )}
            </motion.div>
        );
    }
    
    return (
        <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -50 }} transition={{ duration: 0.7 }} className="h-full w-full flex items-center justify-center p-4">
            <GlassPanel className="w-full max-w-md p-6 sm:p-8 min-h-[350px] flex items-center">
                <AnimatePresence mode="wait">
                    {steps[formStep]}
                </AnimatePresence>
            </GlassPanel>
        </motion.div>
    );
};

const ConversationalQAPage = ({ onNext, user }) => {
    const { generateReport, isLoading } = useAstroPsyche();

    const handleConversationComplete = async (extractedData: Record<string, any>) => {
        try {
            await generateReport(extractedData);
            onNext();
        } catch (error) {
            console.error('Failed to generate report:', error);
        }
    };

    if (!user) {
        return (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="h-full w-full flex items-center justify-center text-white p-4"
            >
                <div className="text-center">
                    <Brain className="animate-pulse mx-auto mb-4" size={48} />
                    <p>Loading your profile...</p>
                </div>
            </motion.div>
        );
    }

    return (
        <ConversationalQuestionnaire
            userId={user.id}
            onComplete={handleConversationComplete}
        />
    );
};

const FinalReportPage = ({ onRestart, user }) => {
    const [report, setReport] = useState<FinalReport | null>(null);
    const [isGenerating, setIsGenerating] = useState(true);
    const { currentReport, downloadPDF } = useAstroPsyche();

    useEffect(() => {
        if (currentReport) {
            setReport(currentReport);
            setIsGenerating(false);
        }
    }, [currentReport]);

    const handleDownloadPDF = async () => {
        if (!report) return;
        try {
            const pdfUrl = await downloadPDF(report.id);
            if (pdfUrl) {
                const link = document.createElement('a');
                link.href = pdfUrl;
                link.download = 'cosmic-blueprint.pdf';
                link.click();
            }
        } catch (error) {
            console.error('Failed to download PDF:', error);
        }
    };

    const handleShare = async () => {
        if (!report) return;
        try {
            const shareUrl = await shareReport(report.id);
            if (navigator.share) {
                await navigator.share({
                    title: 'My Cosmic Blueprint - AstroPsyche',
                    text: `I just discovered I'm "${report.archetype_name}" - ${report.inspirational_line}`,
                    url: shareUrl
                });
            } else {
                await navigator.clipboard.writeText(shareUrl);
                alert('Share link copied to clipboard!');
            }
        } catch (error) {
            console.error('Failed to share:', error);
            // Fallback - just copy a demo URL
            const demoUrl = `${window.location.origin}/shared/demo-${Date.now()}`;
            await navigator.clipboard.writeText(demoUrl);
            alert('Demo share link copied to clipboard!');
        }
    };

    useEffect(() => {
        const handleKeyPress = (e) => {
            if (e.key === 'd' && report) {
                handleDownloadPDF();
            } else if (e.key === 's' && report) {
                handleShare();
            } else if (e.key === 'r') {
                onRestart();
            }
        };
        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [onRestart, report]);

    if (isGenerating || !report) {
        return (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="h-full w-full flex items-center justify-center text-white p-4"
            >
                <div className="text-center">
                    <Sparkles className="animate-spin mx-auto mb-4" size={48} />
                    <p className="text-lg">Weaving your cosmic blueprint...</p>
                    <p className="text-sm text-white/60 mt-2">Integrating conversation insights</p>
                </div>
            </motion.div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7 }}
            className="h-full w-full flex items-center justify-center p-4 text-white"
        >
            <GlassPanel className="w-full max-w-4xl p-4 sm:p-6 md:p-8 flex flex-col max-h-[90vh]">
                <h2 className="text-2xl sm:text-3xl font-bold text-center mb-4 sm:mb-6 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-blue-300 px-4">
                    Your Cosmic Blueprint
                </h2>
                
                <div className="flex-grow overflow-y-auto space-y-4 sm:space-y-6 p-2" style={{maxHeight: '60vh'}}>
                    <div className="px-2">
                        <h3 className="font-bold text-lg sm:text-xl text-purple-300 mb-2">Archetype: {report.archetype_name}</h3>
                        {report.inspirational_line && (
                            <p className="text-white/80 italic text-sm sm:text-base">"{report.inspirational_line}"</p>
                        )}
                    </div>
                    <div className="px-2">
                        <h3 className="font-bold text-lg sm:text-xl text-purple-300 mb-2">Core Insights</h3>
                        <p className="text-white/90 leading-relaxed text-sm sm:text-base">{report.summary_detailed}</p>
                    </div>
                    {report.astrology_breakdown && (
                        <div className="px-2">
                            <h3 className="font-bold text-lg sm:text-xl text-purple-300 mb-2">Astrological Foundation</h3>
                            <p className="text-white/90 leading-relaxed text-sm sm:text-base">{report.astrology_breakdown}</p>
                        </div>
                    )}
                    {report.psychology_insights && (
                        <div className="px-2">
                            <h3 className="font-bold text-lg sm:text-xl text-purple-300 mb-2">Psychological Patterns</h3>
                            <p className="text-white/90 leading-relaxed text-sm sm:text-base">{report.psychology_insights}</p>
                        </div>
                    )}
                    {report.mind_vs_heart && (
                        <div className="px-2">
                            <h3 className="font-bold text-lg sm:text-xl text-purple-300 mb-2">Mind vs. Heart</h3>
                            <p className="text-white/90 leading-relaxed text-sm sm:text-base">{report.mind_vs_heart}</p>
                        </div>
                    )}
                    {report.affirmations && (
                        <div className="px-2">
                            <h3 className="font-bold text-lg sm:text-xl text-purple-300 mb-2">Personal Affirmations</h3>
                            <p className="text-white/90 leading-relaxed italic text-sm sm:text-base">{report.affirmations}</p>
                        </div>
                    )}
                </div>

                <motion.div 
                    initial={{ y: 50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.5, type: "spring", stiffness: 100 }}
                    className="mt-6 sm:mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 px-4"
                >
                    <button 
                        onClick={handleDownloadPDF}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 sm:px-6 py-3 bg-blue-500/80 text-white font-semibold rounded-full transition-all duration-300 hover:bg-blue-500 shadow-lg hover:scale-105 text-sm sm:text-base"
                    >
                        <Download size={18} /> Download PDF
                    </button>
                    <button 
                        onClick={handleShare}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 sm:px-6 py-3 bg-transparent border border-white/30 text-white font-semibold rounded-full transition-all duration-300 hover:bg-white/10 shadow-lg hover:scale-105 text-sm sm:text-base"
                    >
                        <Share2 size={18} /> Share
                    </button>
                </motion.div>
                <div className="mt-4 sm:mt-6 text-center px-4">
                    <button onClick={onRestart} className="text-white/50 hover:text-white transition text-sm sm:text-base">Start Over</button>
                    <p className="text-xs text-white/40 mt-2 hidden sm:block">Press D to download • S to share • R to restart</p>
                </div>
            </GlassPanel>
        </motion.div>
    );
};

// --- MAIN APP ---
export default function App() {
    const [appStep, setAppStep] = useState(0);
    const [formStep, setFormStep] = useState(0);
    const [showAuthModal, setShowAuthModal] = useState(false);
    const backgroundRef = useRef(null);
    const { user: appUser, connectionStatus, checkConnection } = useAstroPsyche();
    const { user: authUser, loading: authLoading, signOut } = useAuth();
    const isDemo = isDemoMode();

    const nextAppStep = () => {
        setAppStep(prev => prev + 1);
        setFormStep(0);
    };
    
    const restart = () => {
        setAppStep(0);
        setFormStep(0);
    };

    const handleAuthSuccess = () => {
        setShowAuthModal(false);
        nextAppStep();
    };

    const handleSignOut = async () => {
        await signOut();
        restart();
    };

    // Show loading while checking auth
    if (authLoading) {
        return (
            <main className="h-screen w-screen bg-black font-sans overflow-hidden flex items-center justify-center">
                <div className="text-white text-center">
                    <Sparkles className="animate-spin mx-auto mb-4" size={48} />
                    <p>Loading...</p>
                </div>
            </main>
        );
    }

    // If not authenticated and not on landing page, show landing
    if (!authUser && appStep > 0) {
        setAppStep(0);
    }

    const pages = [
        <LandingPage key="landing" onNext={nextAppStep} onShowAuth={() => setShowAuthModal(true)} />,
        <BirthDataPage key="birth-data" onNext={nextAppStep} formStep={formStep} setFormStep={setFormStep} backgroundRef={backgroundRef} user={authUser} />,
        <ConversationalQAPage key="conversational-qa" onNext={nextAppStep} user={appUser} />,
        <FinalReportPage key="final-report" onRestart={restart} user={appUser} />
    ];

    return (
        <main className="h-screen w-screen bg-black font-sans overflow-hidden">
            <ThreeBackground ref={backgroundRef} appStep={appStep} formStep={formStep} />
            <ConnectionStatus 
                status={connectionStatus} 
                onRetry={checkConnection} 
                isDemo={isDemo}
            />
            
            {/* Auth Status & Sign Out */}
            {authUser && (
                <div className="fixed top-4 right-4 z-50">
                    <button
                        onClick={handleSignOut}
                        className="bg-white/10 backdrop-blur-sm text-white px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-white/20 transition-colors text-sm"
                    >
                        <LogOut size={16} />
                        <span className="hidden sm:inline">Sign Out</span>
                    </button>
                </div>
            )}
            
            <div className="relative z-10 h-full w-full">
                <AnimatePresence mode="wait">
                    {pages[appStep]}
                </AnimatePresence>
            </div>

            <AnimatePresence>
                {showAuthModal && (
                    <AuthModal
                        isOpen={showAuthModal}
                        onClose={() => setShowAuthModal(false)}
                        onSuccess={handleAuthSuccess}
                    />
                )}
            </AnimatePresence>
        </main>
    );
}