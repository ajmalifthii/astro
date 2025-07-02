import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, Download, Mic, Share2, Type, User, Calendar, Clock, MapPin, Check } from 'lucide-react';
import * as THREE from 'three';
import jsPDF from 'jspdf';

// --- 3D Background Component ---
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
            const geometry = new THREE.SphereGeometry(size, 64, 64); // Higher resolution for perfect spheres
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
        
        // Only the 5 requested planets: Venus, Earth, Mars, Jupiter, Saturn
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

        // Store all necessary objects in the ref
        threeObjects.current = {
            scene, camera, renderer, planets, sun, cameraTarget, cameraPosition,
            isAnimating: false,
            currentTargetIndex: -1, // -1 for default view, 0-4 for planets
            orbitAngle: 0,
            isLoading: false,
            loadingSpeed: 0
        };

        // --- Enhanced Animation Loop ---
        let animationFrameId;
        const animate = () => {
            animationFrameId = requestAnimationFrame(animate);
            const { 
                isAnimating, currentTargetIndex, planets, sun, camera, 
                cameraTarget, cameraPosition, renderer, scene, orbitAngle,
                isLoading, loadingSpeed
            } = threeObjects.current;
            
            if (!renderer) return;

            // Animate planets
            planets.forEach(p => {
                p.orbit.rotation.y += p.orbitSpeed;
                p.mesh.rotation.y += 0.005;
            });
            
            sun.rotation.y += 0.001;

            // Handle loading animation with fast orbiting
            if (isLoading) {
                const currentPlanet = planets[Math.min(currentTargetIndex, planets.length - 1)];
                if (currentPlanet) {
                    const worldPosition = new THREE.Vector3();
                    currentPlanet.mesh.getWorldPosition(worldPosition);
                    
                    const fastOrbitAngle = Date.now() * 0.01; // Fast orbit
                    const orbitRadius = currentPlanet.distance * 0.3;
                    
                    const orbitX = worldPosition.x + Math.cos(fastOrbitAngle) * orbitRadius;
                    const orbitZ = worldPosition.z + Math.sin(fastOrbitAngle) * orbitRadius;
                    const orbitY = worldPosition.y + Math.sin(fastOrbitAngle * 0.5) * 10;
                    
                    camera.position.set(orbitX, orbitY, orbitZ);
                    camera.lookAt(worldPosition);
                }
            }
            // Handle normal camera animation
            else if (isAnimating) {
                if (currentTargetIndex >= 0 && currentTargetIndex < planets.length) {
                    const targetPlanet = planets[currentTargetIndex];
                    const worldPosition = new THREE.Vector3();
                    targetPlanet.mesh.getWorldPosition(worldPosition);
                    
                    // Smooth orbit around the target planet
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
                    // Default wide view
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

        // --- Handle Window Resize ---
        const handleResize = () => {
            if (!threeObjects.current.camera || !threeObjects.current.renderer) return;
            threeObjects.current.camera.aspect = currentMount.clientWidth / currentMount.clientHeight;
            threeObjects.current.camera.updateProjectionMatrix();
            threeObjects.current.renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
        };
        window.addEventListener('resize', handleResize);

        // --- Cleanup ---
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

    // Handle camera movement based on app state
    useEffect(() => {
        const planetSequence = [
            -1, // Landing Page (Default Wide)
            0,  // Venus - Form Step 0
            1,  // Earth - Form Step 1 
            2,  // Mars - Form Step 2
            3,  // Jupiter - Form Step 3
            4,  // Saturn - Form Step 4
            0,  // Venus - Report Preview
            1,  // Earth - Psych Q&A
            2,  // Mars - Final Report
        ];
        
        let targetIndex = -1; // Default view
        
        if (appStep === 1) { // BirthDataPage
            targetIndex = planetSequence[1 + formStep] ?? -1;
        } else if (appStep > 1) {
            targetIndex = planetSequence[5 + appStep - 1] ?? -1;
        } else {
            targetIndex = planetSequence[appStep] ?? -1;
        }
        
        if (threeObjects.current && threeObjects.current.isAnimating !== undefined) {
            threeObjects.current.isAnimating = true;
            threeObjects.current.currentTargetIndex = targetIndex;
            threeObjects.current.orbitAngle = 0; // Reset orbit angle for smooth transition
        }
    }, [appStep, formStep]);

    // Expose loading control
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

// --- MOCK DATA & HELPERS ---
const MOCK_ARCHETYPE = {
    name: "The Star-Weaver",
    blend: "Aries Sun, Cancer Moon",
    inspirationalLine: "You weave light from chaos and find home in the journey."
};

const MOCK_REPORT = {
    summary: "A dynamic and emotionally intuitive individual, you are driven by a pioneering spirit yet find deep comfort in connection and security. Your core challenge is balancing your desire for action with your need for emotional nourishment.",
    fullReport: {
        astrology: "Your Aries Sun fuels your ambition and courage, making you a natural leader. However, your Cancer Moon provides a sensitive, nurturing core. This combination can lead to internal friction but also immense creative potential.",
        psychology: "Your responses indicate a high degree of self-awareness and a tendency towards introspection. You value authenticity and are not afraid to confront difficult truths.",
        mindVsHeart: "There is a notable tension between your logical mind and your emotional world. You often try to rationalize your feelings, but your heart ultimately guides your most important decisions.",
        affirmation: "I honor both the fire that drives me and the water that sustains me. My power lies in their union."
    }
};

const calculateAge = (dob) => {
    if (!dob) return null;
    const birthDate = new Date(dob);
    const today = new Date();
    let years = today.getFullYear() - birthDate.getFullYear();
    let months = today.getMonth() - birthDate.getMonth();
    if (months < 0 || (months === 0 && today.getDate() < birthDate.getDate())) {
        years--;
        months += 12;
    }
    return { years, months };
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
        className={`px-8 py-3 bg-purple-500/80 text-white font-bold rounded-full transition-all duration-300 shadow-lg backdrop-blur-sm border border-purple-400/50 ${className} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
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
            className="w-full bg-black/20 border border-white/20 rounded-lg py-3 pl-12 pr-4 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all duration-300"
        />
    </div>
);

// --- PAGE COMPONENTS ---
const LandingPage = ({ onNext }) => {
    // Add keyboard event listener
    useEffect(() => {
        const handleKeyPress = (e) => {
            if (e.key === 'Enter') {
                onNext();
            }
        };
        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [onNext]);

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
                className="text-4xl md:text-6xl font-thin tracking-wider mb-6"
            >
                Astro<span className="font-light text-purple-300">Psyche</span>
            </motion.h1>
            <motion.p 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.8, duration: 1 }}
                className="text-lg md:text-xl text-white/70 mb-12 max-w-md"
            >
                "The stars hold stories you haven't heard yet..."
            </motion.p>
            <PrimaryButton onClick={onNext}>
                Begin Self-Discovery
            </PrimaryButton>
            <p className="text-sm text-white/40 mt-4">Press Enter to continue</p>
        </motion.div>
    );
};

const BirthDataPage = ({ onNext, formStep, setFormStep, backgroundRef }) => {
    const [formData, setFormData] = useState({
        name: '',
        gender: '',
        dob: '',
        age: null,
        time: '',
        location: null,
        locationInput: ''
    });
    const [loading, setLoading] = useState(false);

    const nextFormStep = () => setFormStep(prev => prev + 1);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };
    
    useEffect(() => {
        if (formStep === 3) {
            const timer = setTimeout(() => {
                nextFormStep();
            }, 2500); 
            return () => clearTimeout(timer);
        }
    }, [formStep]);

    const handleDobSubmit = () => {
        const age = calculateAge(formData.dob);
        setFormData(prev => ({ ...prev, age }));
        nextFormStep();
    };
    
    const handleLocationSelect = () => {
        setFormData(prev => ({ ...prev, location: { name: formData.locationInput || 'Eiffel Tower, Paris', lat: 48.8584, lon: 2.2945 } }));
        nextFormStep();
    };

    const handleSubmit = () => {
        setLoading(true);
        // Start loading animation in 3D background
        if (backgroundRef?.current?.startLoading) {
            backgroundRef.current.startLoading();
        }
        setTimeout(() => {
            if (backgroundRef?.current?.stopLoading) {
                backgroundRef.current.stopLoading();
            }
            onNext();
        }, 3000);
    };

    // Keyboard event handlers
    useEffect(() => {
        const handleKeyPress = (e) => {
            if (e.key === 'Enter') {
                if (formStep === 0 && formData.name) nextFormStep();
                else if (formStep === 2 && formData.dob) handleDobSubmit();
                else if (formStep === 4 && formData.time) nextFormStep();
                else if (formStep === 5 && formData.locationInput) handleLocationSelect();
                else if (formStep === 6) handleSubmit();
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
            <h2 className="text-2xl font-bold text-white mb-6 text-center">What is your name?</h2>
            <InputField name="name" placeholder="Your Name" icon={<User size={18} />} value={formData.name} onChange={handleInputChange} />
            <div className="mt-8 flex flex-col items-center">
                <PrimaryButton onClick={nextFormStep} disabled={!formData.name}>Continue</PrimaryButton>
                <p className="text-xs text-white/40 mt-2">Press Enter to continue</p>
            </div>
        </motion.div>,
        <motion.div key="gender" {...motionProps} className="w-full flex flex-col items-center">
            <h2 className="text-2xl font-bold text-white mb-6 text-center">How do you identify?</h2>
            <div className="flex space-x-4">
                {['Male', 'Female', 'Other'].map(g => (
                    <button key={g} onClick={() => { setFormData(p => ({...p, gender: g})); nextFormStep(); }}
                        className="px-6 py-3 bg-black/20 border border-white/20 rounded-lg text-white hover:bg-white/10 transition-all">
                        {g}
                    </button>
                ))}
            </div>
            <p className="text-xs text-white/40 mt-4">Backspace to go back</p>
        </motion.div>,
        <motion.div key="dob" {...motionProps} className="w-full flex flex-col items-center">
            <h2 className="text-2xl font-bold text-white mb-6 text-center">When were you born?</h2>
            <InputField name="dob" type="date" placeholder="Date of Birth" icon={<Calendar size={18} />} value={formData.dob} onChange={handleInputChange} />
            <div className="mt-8 flex flex-col items-center">
                <PrimaryButton onClick={handleDobSubmit} disabled={!formData.dob}>Confirm Date</PrimaryButton>
                <p className="text-xs text-white/40 mt-2">Press Enter to continue</p>
            </div>
        </motion.div>,
        <motion.div key="age" {...motionProps} className="w-full flex flex-col items-center text-center">
            <h2 className="text-2xl font-bold text-white mb-4">You are</h2>
            <div className="text-5xl font-bold text-purple-300 animate-pulse">
                {formData.age?.years} years & {formData.age?.months} months
            </div>
            <p className="text-white/70 mt-4">old.</p>
        </motion.div>,
        <motion.div key="time" {...motionProps} className="w-full flex flex-col items-center">
            <h2 className="text-2xl font-bold text-white mb-6 text-center">And at what time?</h2>
            <InputField name="time" type="time" placeholder="Time of Birth" icon={<Clock size={18} />} value={formData.time} onChange={handleInputChange} />
            <div className="mt-8 flex flex-col items-center">
                <PrimaryButton onClick={nextFormStep} disabled={!formData.time}>Next</PrimaryButton>
                <p className="text-xs text-white/40 mt-2">Press Enter to continue</p>
            </div>
        </motion.div>,
        <motion.div key="location" {...motionProps} className="w-full flex flex-col items-center">
            <h2 className="text-2xl font-bold text-white mb-6 text-center">Where were you born?</h2>
            <InputField name="locationInput" placeholder="City, Country (e.g., Paris, France)" icon={<MapPin size={18} />} value={formData.locationInput} onChange={handleInputChange} />
            <p className="text-xs text-white/50 mt-2">Simulating Google Places Autocomplete</p>
            <div className="mt-8 flex flex-col items-center">
                <PrimaryButton onClick={handleLocationSelect} disabled={!formData.locationInput}>Select Location</PrimaryButton>
                <p className="text-xs text-white/40 mt-2">Press Enter to continue</p>
            </div>
        </motion.div>,
        <motion.div key="map" {...motionProps} className="w-full flex flex-col items-center">
             <h2 className="text-2xl font-bold text-white mb-4 text-center">Confirming Location</h2>
             <motion.div 
                initial={{ scale: 2, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 1.5, ease: 'easeOut' }}
                className="w-64 h-40 bg-gray-800 rounded-lg border border-blue-400/50 overflow-hidden relative flex items-center justify-center shadow-2xl">
                <img src="https://images.pexels.com/photos/355770/pexels-photo-355770.jpeg" alt="Map Preview" className="w-full h-full object-cover opacity-30" />
                <div className="absolute w-3 h-3 bg-purple-400 rounded-full animate-ping"></div>
                <div className="absolute w-3 h-3 bg-purple-400 rounded-full"></div>
             </motion.div>
             <div className="text-center mt-4">
                <p className="font-bold text-white">{formData.location?.name}</p>
                <p className="text-sm text-white/60">Lat: {formData.location?.lat}, Lon: {formData.location?.lon}</p>
             </div>
             <div className="mt-6 flex flex-col items-center">
                <PrimaryButton onClick={handleSubmit}><Check className="inline-block mr-2"/> Confirm & Generate</PrimaryButton>
                <p className="text-xs text-white/40 mt-2">Press Enter to continue</p>
             </div>
        </motion.div>
    ];

    if (loading) {
        return (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full w-full flex flex-col items-center justify-center text-white p-4">
                <p className="mt-8 text-lg text-white/80">Aligning the cosmos...</p>
                <p className="text-sm text-white/60 mt-2">Camera orbiting around celestial bodies</p>
            </motion.div>
        );
    }
    
    return (
        <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -50 }} transition={{ duration: 0.7 }} className="h-full w-full flex items-center justify-center p-4">
            <GlassPanel className="w-full max-w-md p-8 min-h-[350px] flex items-center">
                <AnimatePresence mode="wait">
                    {steps[formStep]}
                </AnimatePresence>
            </GlassPanel>
        </motion.div>
    );
};

const ReportPreviewPage = ({ onNext }) => {
    const [activeTab, setActiveTab] = useState('simple');

    // Keyboard event handlers
    useEffect(() => {
        const handleKeyPress = (e) => {
            if (e.key === 'Enter') {
                onNext();
            } else if (e.key === '1') {
                setActiveTab('simple');
            } else if (e.key === '2') {
                setActiveTab('detailed');
            }
        };
        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [onNext]);

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.7 }}
            className="h-full w-full flex flex-col items-center justify-center p-4 text-white"
        >
            <GlassPanel className="w-full max-w-2xl p-6 md:p-8 flex flex-col">
                <motion.div 
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.5 }}
                    className="text-center mb-6"
                >
                    <h3 className="text-2xl font-bold text-purple-300">{MOCK_ARCHETYPE.name}</h3>
                    <p className="text-white/70">{MOCK_ARCHETYPE.blend}</p>
                    <p className="text-lg mt-2 italic">"{MOCK_ARCHETYPE.inspirationalLine}"</p>
                </motion.div>

                <div className="flex justify-center border-b border-white/20 mb-4">
                    <button onClick={() => setActiveTab('simple')} className={`px-4 py-2 text-lg font-semibold transition-colors ${activeTab === 'simple' ? 'text-purple-400 border-b-2 border-purple-400' : 'text-white/60'}`}>Summary</button>
                    <button onClick={() => setActiveTab('detailed')} className={`px-4 py-2 text-lg font-semibold transition-colors ${activeTab === 'detailed' ? 'text-purple-400 border-b-2 border-purple-400' : 'text-white/60'}`}>Detailed</button>
                </div>

                <div className="flex-grow overflow-y-auto p-2" style={{maxHeight: '40vh'}}>
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.4 }}
                        >
                            {activeTab === 'simple' ? (
                                <p className="text-white/90 leading-relaxed">{MOCK_REPORT.summary}</p>
                            ) : (
                                <div className="space-y-4">
                                    <div>
                                        <h4 className="font-bold text-purple-300 mb-1">Astrology Breakdown</h4>
                                        <p className="text-white/90 leading-relaxed text-sm">{MOCK_REPORT.fullReport.astrology}</p>
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-purple-300 mb-1">Psychological Insights</h4>
                                        <p className="text-white/90 leading-relaxed text-sm">{MOCK_REPORT.fullReport.psychology}</p>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>
                
                <div className="mt-8 flex flex-col items-center">
                    <PrimaryButton onClick={onNext}>
                        Deepen with Psychology <ChevronRight size={20} className="inline-block ml-2" />
                    </PrimaryButton>
                    <p className="text-xs text-white/40 mt-2">Press Enter to continue • Press 1/2 to switch tabs</p>
                </div>
            </GlassPanel>
        </motion.div>
    );
};

const PsychQAPage = ({ onNext }) => {
    const [mode, setMode] = useState('text');
    const [question, setQuestion] = useState("What is a challenge you're currently proud of overcoming?");
    const [answer, setAnswer] = useState('');
    const [isRecording, setIsRecording] = useState(false);

    const handleNextQuestion = () => {
        setQuestion("Describe a time you felt most aligned with your purpose.");
        setAnswer('');
    };

    // Keyboard event handlers
    useEffect(() => {
        const handleKeyPress = (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (answer.length > 0 || isRecording) {
                    handleNextQuestion();
                } else {
                    onNext();
                }
            } else if (e.key === 'Tab') {
                e.preventDefault();
                setMode(mode === 'text' ? 'voice' : 'text');
            }
        };
        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [answer, isRecording, mode, onNext]);
    
    return (
        <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            transition={{ duration: 0.7 }}
            className="h-full w-full flex items-center justify-center p-4"
        >
            <GlassPanel className="w-full max-w-lg p-8 flex flex-col items-center">
                <h2 className="text-xl font-light text-white mb-6 text-center">
                    {question}
                </h2>

                <div className="flex items-center space-x-4 mb-6">
                    <button onClick={() => setMode('text')} className={`p-3 rounded-full transition-all ${mode === 'text' ? 'bg-purple-500/50' : 'bg-black/20'}`}>
                        <Type className="text-white" />
                    </button>
                    <button onClick={() => setMode('voice')} className={`p-3 rounded-full transition-all ${mode === 'voice' ? 'bg-purple-500/50' : 'bg-black/20'}`}>
                        <Mic className="text-white" />
                    </button>
                </div>

                <div className="w-full min-h-[100px] flex items-center justify-center">
                    {mode === 'text' ? (
                        <textarea
                            value={answer}
                            onChange={(e) => setAnswer(e.target.value)}
                            placeholder="Type your thoughts here..."
                            className="w-full h-24 bg-black/20 border border-white/20 rounded-lg p-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all duration-300 resize-none"
                        />
                    ) : (
                        <div className="flex flex-col items-center">
                            <motion.button 
                                onClick={() => setIsRecording(!isRecording)}
                                className={`w-20 h-20 rounded-full flex items-center justify-center transition-colors ${isRecording ? 'bg-red-500/80' : 'bg-purple-500/80'}`}
                            >
                                <Mic size={32} className="text-white" />
                            </motion.button>
                            {isRecording && <div className="text-white/70 mt-2">Recording...</div>}
                        </div>
                    )}
                </div>

                <div className="mt-8 flex flex-col items-center">
                     <PrimaryButton onClick={answer.length > 0 || isRecording ? handleNextQuestion : onNext}>
                        {answer.length > 0 || isRecording ? 'Next Question' : 'Finalize Report'}
                    </PrimaryButton>
                    <p className="text-xs text-white/40 mt-2">Press Enter to continue • Tab to switch mode</p>
                </div>
            </GlassPanel>
        </motion.div>
    );
};

const FinalReportPage = ({ onRestart }) => {
    // Download PDF functionality
    const handleDownloadPDF = () => {
        const pdf = new jsPDF();
        
        // Title
        pdf.setFontSize(20);
        pdf.setTextColor(128, 0, 128);
        pdf.text('Your Cosmic Blueprint', 20, 30);
        
        // Archetype
        pdf.setFontSize(16);
        pdf.setTextColor(0, 0, 0);
        pdf.text(`Archetype: ${MOCK_ARCHETYPE.name}`, 20, 50);
        
        // Inspirational line
        pdf.setFontSize(12);
        pdf.setTextColor(100, 100, 100);
        pdf.text(`"${MOCK_ARCHETYPE.inspirationalLine}"`, 20, 65);
        
        // Core Insights
        pdf.setFontSize(14);
        pdf.setTextColor(0, 0, 0);
        pdf.text('Core Insights:', 20, 85);
        
        const summaryLines = pdf.splitTextToSize(MOCK_REPORT.summary, 170);
        pdf.setFontSize(11);
        pdf.text(summaryLines, 20, 100);
        
        // Mind vs Heart
        pdf.text('Mind vs. Heart:', 20, 140);
        const mindHeartLines = pdf.splitTextToSize(MOCK_REPORT.fullReport.mindVsHeart, 170);
        pdf.text(mindHeartLines, 20, 155);
        
        // Affirmation
        pdf.text('Affirmation:', 20, 190);
        const affirmationLines = pdf.splitTextToSize(MOCK_REPORT.fullReport.affirmation, 170);
        pdf.setTextColor(128, 0, 128);
        pdf.text(affirmationLines, 20, 205);
        
        pdf.save('cosmic-blueprint.pdf');
    };

    // Share functionality
    const handleShare = async () => {
        const shareData = {
            title: 'My Cosmic Blueprint - AstroPsyche',
            text: `I just discovered I'm "${MOCK_ARCHETYPE.name}" - ${MOCK_ARCHETYPE.inspirationalLine}`,
            url: window.location.href
        };
        
        if (navigator.share) {
            try {
                await navigator.share(shareData);
            } catch (err) {
                console.log('Error sharing:', err);
                fallbackShare();
            }
        } else {
            fallbackShare();
        }
    };

    const fallbackShare = () => {
        const text = `I just discovered I'm "${MOCK_ARCHETYPE.name}" - ${MOCK_ARCHETYPE.inspirationalLine}. Check out AstroPsyche!`;
        navigator.clipboard.writeText(text).then(() => {
            alert('Copied to clipboard! Share it anywhere you like.');
        }).catch(() => {
            alert('Unable to copy. Please manually share your results!');
        });
    };

    // Keyboard event handlers
    useEffect(() => {
        const handleKeyPress = (e) => {
            if (e.key === 'd') {
                handleDownloadPDF();
            } else if (e.key === 's') {
                handleShare();
            } else if (e.key === 'r') {
                onRestart();
            }
        };
        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [onRestart]);

    return (
        <motion.div
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7 }}
            className="h-full w-full flex items-center justify-center p-4 text-white"
        >
            <GlassPanel className="w-full max-w-3xl p-6 md:p-8 flex flex-col">
                <h2 className="text-3xl font-bold text-center mb-6 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-blue-300">
                    Your Cosmic Blueprint
                </h2>
                
                <div className="flex-grow overflow-y-auto space-y-6 p-2" style={{maxHeight: '60vh'}}>
                    <div>
                        <h3 className="font-bold text-xl text-purple-300 mb-2">Archetype: {MOCK_ARCHETYPE.name}</h3>
                        <p className="text-white/80 italic">"{MOCK_ARCHETYPE.inspirationalLine}"</p>
                    </div>
                    <div>
                        <h3 className="font-bold text-xl text-purple-300 mb-2">Core Insights</h3>
                        <p className="text-white/90 leading-relaxed">{MOCK_REPORT.summary}</p>
                    </div>
                    <div>
                        <h3 className="font-bold text-xl text-purple-300 mb-2">Mind vs. Heart</h3>
                        <p className="text-white/90 leading-relaxed">{MOCK_REPORT.fullReport.mindVsHeart}</p>
                    </div>
                     <div>
                        <h3 className="font-bold text-xl text-purple-300 mb-2">Poetic Affirmation</h3>
                        <p className="text-white/90 leading-relaxed italic">{MOCK_REPORT.fullReport.affirmation}</p>
                    </div>
                </div>

                <motion.div 
                    initial={{ y: 50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.5, type: "spring", stiffness: 100 }}
                    className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4"
                >
                    <button 
                        onClick={handleDownloadPDF}
                        className="flex items-center gap-2 px-6 py-3 bg-blue-500/80 text-white font-semibold rounded-full transition-all duration-300 hover:bg-blue-500 shadow-lg hover:scale-105"
                    >
                        <Download size={20} /> Download PDF
                    </button>
                    <button 
                        onClick={handleShare}
                        className="flex items-center gap-2 px-6 py-3 bg-transparent border border-white/30 text-white font-semibold rounded-full transition-all duration-300 hover:bg-white/10 shadow-lg hover:scale-105"
                    >
                        <Share2 size={20} /> Share
                    </button>
                </motion.div>
                <div className="mt-6 text-center">
                    <button onClick={onRestart} className="text-white/50 hover:text-white transition">Start Over</button>
                    <p className="text-xs text-white/40 mt-2">Press D to download • S to share • R to restart</p>
                </div>
            </GlassPanel>
        </motion.div>
    );
};

// --- MAIN APP ---
export default function App() {
    const [appStep, setAppStep] = useState(0);
    const [formStep, setFormStep] = useState(0);
    const backgroundRef = useRef(null);

    const nextAppStep = () => {
        setAppStep(prev => prev + 1);
        setFormStep(0);
    };
    
    const restart = () => {
        setAppStep(0);
        setFormStep(0);
    };

    const pages = [
        <LandingPage key="landing" onNext={nextAppStep} />,
        <BirthDataPage key="birth-data" onNext={nextAppStep} formStep={formStep} setFormStep={setFormStep} backgroundRef={backgroundRef} />,
        <ReportPreviewPage key="report-preview" onNext={nextAppStep} />,
        <PsychQAPage key="psych-qa" onNext={nextAppStep} />,
        <FinalReportPage key="final-report" onRestart={restart} />
    ];

    return (
        <main className="h-screen w-screen bg-black font-sans overflow-hidden">
            <ThreeBackground ref={backgroundRef} appStep={appStep} formStep={formStep} />
            <div className="relative z-10 h-full w-full">
                <AnimatePresence mode="wait">
                    {pages[appStep]}
                </AnimatePresence>
            </div>
        </main>
    );
}