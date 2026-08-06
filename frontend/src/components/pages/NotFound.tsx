import React, { useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { motion } from 'framer-motion';

const ENV_MAP_URL = 'https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/studio_country_hall_1k.hdr';
const FONT_URL = 'https://threejs.org/examples/fonts/helvetiker_bold.typeface.json';

const GodRaysShader = {
    vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
            vec4 worldPosition = modelMatrix * vec4(position, 1.0);
            vWorldPosition = worldPosition.xyz;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        varying vec3 vWorldPosition;
        uniform vec3 lightPosition;
        uniform vec3 color;
        uniform float decay;
        uniform float intensity;
        void main() {
            float dist = distance(vWorldPosition, lightPosition);
            float glow = intensity * exp(-decay * dist);
            gl_FragColor = vec4(color, glow);
        }
    `
};

const ThreeBackground = (): React.ReactElement => {
    const containerRef = useRef<HTMLDivElement>(null);
    const sceneRef = useRef<any>(null);
    const cameraRef = useRef<any>(null);
    const rendererRef = useRef<any>(null);
    const composerRef = useRef<any>(null);
    const controlsRef = useRef<any>(null);
    const clockRef = useRef<THREE.Clock>(new THREE.Clock());
    const animFrameRef = useRef<any>(null);
    const mouseRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
    const lightHelpersRef = useRef<any[]>([]);
    const objectsToDisposeRef = useRef<any[]>([]);

    const cleanup = useCallback(() => {
        objectsToDisposeRef.current.forEach((obj: any) => {
            if (obj.geometry) obj.geometry.dispose();
            if (obj.material) {
                if (Array.isArray(obj.material)) {
                    obj.material.forEach((mat: any) => {
                        Object.keys(mat).forEach((key: string) => {
                            if (mat[key] && mat[key].isTexture) mat[key].dispose();
                        });
                        mat.dispose();
                    });
                } else {
                    Object.keys(obj.material).forEach((key: string) => {
                        if (obj.material[key] && obj.material[key].isTexture) obj.material[key].dispose();
                    });
                    obj.material.dispose();
                }
            }
        });
        objectsToDisposeRef.current = [];

        lightHelpersRef.current.forEach((helper: any) => {
            if (helper.parent) helper.parent.remove(helper);
            if (helper.geometry) helper.geometry.dispose();
            if (helper.material) helper.material.dispose();
        });
        lightHelpersRef.current = [];

        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        if (composerRef.current) composerRef.current.dispose();
        if (rendererRef.current) {
            rendererRef.current.dispose();
            rendererRef.current.forceContextLoss();
        }
        if (controlsRef.current) controlsRef.current.dispose();
    }, []);

    useEffect(() => {
        if (!containerRef.current) return;
        
        cleanup();
        
        const container = containerRef.current;
        const width = container.clientWidth;
        const height = container.clientHeight;

        const scene = new THREE.Scene();
        scene.fog = new THREE.FogExp2(0x0a0a1a, 0.0008);
        sceneRef.current = scene;

        const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
        camera.position.set(8, 4, 12);
        camera.lookAt(0, 0.5, 0);
        cameraRef.current = camera;

        const renderer = new THREE.WebGLRenderer({ 
            antialias: true, 
            alpha: true,
            powerPreference: "high-performance"
        });
        renderer.setSize(width, height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.2;
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        container.appendChild(renderer.domElement);
        rendererRef.current = renderer;

        const renderPass = new RenderPass(scene, camera);
        const bloomPass = new UnrealBloomPass(new THREE.Vector2(width, height), 0.4, 0.2, 0.85);
        bloomPass.threshold = 0.1;
        bloomPass.strength = 0.8;
        bloomPass.radius = 0.5;

        const composer = new EffectComposer(renderer);
        composer.addPass(renderPass);
        composer.addPass(bloomPass);
        composerRef.current = composer;

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.autoRotate = true;
        controls.autoRotateSpeed = 0.8;
        controls.target.set(0, 0.8, 0);
        controls.minDistance = 6;
        controls.maxDistance = 18;
        controls.maxPolarAngle = Math.PI / 1.8;
        controls.update();
        controlsRef.current = controls;

        const hdrLoader = new HDRLoader();
        hdrLoader.load(ENV_MAP_URL, (texture: any) => {
            texture.mapping = THREE.EquirectangularReflectionMapping;
            scene.environment = texture;
            scene.background = new THREE.Color(0x0a0a1a);
        }, undefined, (error: any) => {
            console.warn('Failed to load environment map, using fallback color', error);
            scene.background = new THREE.Color(0x0a0a1a);
        });

        const ambientLight = new THREE.AmbientLight(0x404066, 0.6);
        scene.add(ambientLight);

        const keyLight = new THREE.DirectionalLight(0xffeedd, 4);
        keyLight.position.set(5, 8, 5);
        keyLight.castShadow = true;
        keyLight.shadow.mapSize.width = 1024;
        keyLight.shadow.mapSize.height = 1024;
        keyLight.shadow.camera.near = 0.5;
        keyLight.shadow.camera.far = 50;
        keyLight.shadow.camera.left = -10;
        keyLight.shadow.camera.right = 10;
        keyLight.shadow.camera.top = 10;
        keyLight.shadow.camera.bottom = -10;
        keyLight.shadow.bias = -0.0001;
        keyLight.shadow.normalBias = 0.02;
        scene.add(keyLight);

        const rimLight = new THREE.DirectionalLight(0x4488ff, 3);
        rimLight.position.set(-5, 2, -5);
        scene.add(rimLight);

        const pointLight1 = new THREE.PointLight(0xff3366, 15, 8);
        pointLight1.position.set(3, 2, 2);
        pointLight1.castShadow = true;
        pointLight1.shadow.mapSize.width = 512;
        pointLight1.shadow.mapSize.height = 512;
        pointLight1.shadow.camera.near = 0.1;
        pointLight1.shadow.camera.far = 20;
        scene.add(pointLight1);

        const pointLight2 = new THREE.PointLight(0x33ff99, 12, 8);
        pointLight2.position.set(-3, 3, -2);
        pointLight2.castShadow = true;
        pointLight2.shadow.mapSize.width = 512;
        pointLight2.shadow.mapSize.height = 512;
        pointLight2.shadow.camera.near = 0.1;
        pointLight2.shadow.camera.far = 20;
        scene.add(pointLight2);

        const pointLight3 = new THREE.PointLight(0xffaa00, 10, 7);
        pointLight3.position.set(0, 5, 4);
        scene.add(pointLight3);

        const spotLight = new THREE.SpotLight(0xff9966, 25, 15, Math.PI / 8, 0.3, 0.5);
        spotLight.position.set(0, 8, -2);
        spotLight.target.position.set(0, 0.5, 0);
        spotLight.castShadow = true;
        spotLight.shadow.mapSize.width = 1024;
        spotLight.shadow.mapSize.height = 1024;
        scene.add(spotLight);
        scene.add(spotLight.target);

        const coneGeometry = new THREE.CylinderGeometry(0.5, 3, 8, 32, 1, true);
        const coneMaterial = new THREE.ShaderMaterial({
            uniforms: {
                lightPosition: { value: spotLight.position },
                color: { value: new THREE.Color(0xff9966) },
                decay: { value: 0.6 },
                intensity: { value: 0.15 }
            },
            vertexShader: GodRaysShader.vertexShader,
            fragmentShader: GodRaysShader.fragmentShader,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        const lightCone = new THREE.Mesh(coneGeometry, coneMaterial);
        lightCone.position.copy(spotLight.position);
        lightCone.rotation.x = Math.PI;
        scene.add(lightCone);
        lightHelpersRef.current.push(lightCone);

        const movingLights = [pointLight1, pointLight2, pointLight3];

        const groundGeometry = new THREE.PlaneGeometry(20, 20);
        const groundMaterial = new THREE.MeshStandardMaterial({
            color: 0x111122,
            roughness: 0.4,
            metalness: 0.9,
        });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = -2;
        ground.receiveShadow = true;
        scene.add(ground);
        objectsToDisposeRef.current.push(ground);

        const gridHelper = new THREE.PolarGridHelper(8, 32, 24, 64, 0x334466, 0x223355);
        gridHelper.position.y = -1.99;
        scene.add(gridHelper);

        const fontLoader = new FontLoader();
        fontLoader.load(FONT_URL, (font: any) => {
            const textGeometry = new TextGeometry('404', {
                font: font,
                size: 2.5,
                depth: 0.8,
                curveSegments: 6,
                bevelEnabled: true,
                bevelThickness: 0.15,
                bevelSize: 0.08,
                bevelOffset: 0,
                bevelSegments: 5,
            });
            textGeometry.center();

            const textMaterial = new THREE.MeshStandardMaterial({
                color: 0xffffff,
                roughness: 0.15,
                metalness: 0.95,
                envMapIntensity: 1.2,
            });

            const textMesh = new THREE.Mesh(textGeometry, textMaterial);
            textMesh.position.y = 0.5;
            textMesh.castShadow = true;
            textMesh.receiveShadow = true;
            scene.add(textMesh);
            objectsToDisposeRef.current.push(textMesh);

            const edgeGeometry = new THREE.EdgesGeometry(textGeometry);
            const edgeMaterial = new THREE.LineBasicMaterial({ 
                color: 0x88aacc, 
                transparent: true, 
                opacity: 0.2 
            });
            const edgeLine = new THREE.LineSegments(edgeGeometry, edgeMaterial);
            textMesh.add(edgeLine);
        });

        const floatingObjects: any[] = [];
        
        const torusKnotGeo = new THREE.TorusKnotGeometry(0.6, 0.2, 100, 16);
        const torusKnotMat = new THREE.MeshStandardMaterial({
            color: 0x4466aa,
            roughness: 0.3,
            metalness: 0.8,
            envMapIntensity: 0.8,
        });
        const torusKnot = new THREE.Mesh(torusKnotGeo, torusKnotMat);
        torusKnot.position.set(-4, 0.5, -2);
        torusKnot.castShadow = true;
        torusKnot.receiveShadow = true;
        scene.add(torusKnot);
        floatingObjects.push({ mesh: torusKnot, speed: 0.3, amplitude: 0.5, offset: 0 });
        objectsToDisposeRef.current.push(torusKnot);

        const icosaGeo = new THREE.IcosahedronGeometry(0.7, 1);
        const icosaMat = new THREE.MeshStandardMaterial({
            color: 0xaa4488,
            roughness: 0.25,
            metalness: 0.7,
            envMapIntensity: 0.9,
        });
        const icosa = new THREE.Mesh(icosaGeo, icosaMat);
        icosa.position.set(3.5, 1.2, -1.5);
        icosa.castShadow = true;
        icosa.receiveShadow = true;
        scene.add(icosa);
        floatingObjects.push({ mesh: icosa, speed: 0.4, amplitude: 0.6, offset: 1.5 });
        objectsToDisposeRef.current.push(icosa);

        const octaGeo = new THREE.OctahedronGeometry(0.5, 0);
        const octaMat = new THREE.MeshStandardMaterial({
            color: 0x44aa88,
            roughness: 0.2,
            metalness: 0.85,
            envMapIntensity: 1.0,
        });
        const octa = new THREE.Mesh(octaGeo, octaMat);
        octa.position.set(-2.5, 1.8, 2.5);
        octa.castShadow = true;
        octa.receiveShadow = true;
        scene.add(octa);
        floatingObjects.push({ mesh: octa, speed: 0.5, amplitude: 0.4, offset: 3 });
        objectsToDisposeRef.current.push(octa);

        const sphereGeo = new THREE.SphereGeometry(0.3, 32, 32);
        const sphereMat = new THREE.MeshStandardMaterial({
            color: 0xff8844,
            roughness: 0.3,
            metalness: 0.6,
            envMapIntensity: 0.7,
        });
        const sphere = new THREE.Mesh(sphereGeo, sphereMat);
        sphere.position.set(4.5, 0.8, 2);
        sphere.castShadow = true;
        sphere.receiveShadow = true;
        scene.add(sphere);
        floatingObjects.push({ mesh: sphere, speed: 0.6, amplitude: 0.7, offset: 5 });
        objectsToDisposeRef.current.push(sphere);

        const animate = () => {
            const time = clockRef.current.getElapsedTime();
            
            movingLights.forEach((light: any, index: number) => {
                const radius = 4 + index * 0.5;
                const speed = 0.5 + index * 0.2;
                light.position.x = Math.cos(time * speed + index) * radius;
                light.position.z = Math.sin(time * speed + index) * radius;
                light.intensity = 10 + Math.sin(time * 2 + index) * 4;
            });

            floatingObjects.forEach((obj: any) => {
                obj.mesh.position.y += Math.sin(time * obj.speed + obj.offset) * 0.005;
                obj.mesh.rotation.x += 0.003;
                obj.mesh.rotation.y += 0.005;
            });

            if (mouseRef.current) {
                const targetX = mouseRef.current.x * 0.5;
                const targetY = -mouseRef.current.y * 0.3;
                camera.position.x += (targetX - camera.position.x) * 0.02;
                camera.position.y += (targetY - camera.position.y) * 0.02;
                camera.lookAt(0, 0.8, 0);
            }

            controlsRef.current?.update();
            
            if (composerRef.current) {
                composerRef.current.render();
            }

            animFrameRef.current = requestAnimationFrame(animate);
        };

        animate();

        const handleMouseMove = (event: MouseEvent) => {
            mouseRef.current = {
                x: (event.clientX / window.innerWidth) * 2 - 1,
                y: -(event.clientY / window.innerHeight) * 2 + 1
            };
        };
        window.addEventListener('mousemove', handleMouseMove);

        const handleResize = () => {
            if (!containerRef.current || !cameraRef.current || !rendererRef.current || !composerRef.current) return;
            const w = containerRef.current.clientWidth;
            const h = containerRef.current.clientHeight;
            cameraRef.current.aspect = w / h;
            cameraRef.current.updateProjectionMatrix();
            rendererRef.current.setSize(w, h);
            composerRef.current.setSize(w, h);
        };
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('resize', handleResize);
            cleanup();
        };
    }, [cleanup]);

    return (
        <div 
            ref={containerRef} 
            style={{ 
                position: 'fixed', 
                top: 0, 
                left: 0, 
                width: '100%', 
                height: '100%', 
                zIndex: 0,
                background: 'radial-gradient(ellipse at center, #1a1a3a 0%, #0a0a1a 70%)'
            }} 
        />
    );
};

const GlassUI = (): React.ReactElement => {
    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            zIndex: 10,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
            alignItems: 'center',
            padding: '2rem',
            pointerEvents: 'none',
        }}>
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
                style={{
                    pointerEvents: 'auto',
                    width: '100%',
                    maxWidth: '560px',
                    background: 'rgba(10, 10, 30, 0.65)',
                    backdropFilter: 'blur(24px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(24px) saturate(180%)',
                    borderRadius: '24px',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderTop: '1px solid rgba(255, 255, 255, 0.2)',
                    borderLeft: '1px solid rgba(255, 255, 255, 0.15)',
                    padding: '2.5rem 2rem',
                    boxShadow: `
                        0 20px 60px rgba(0, 0, 0, 0.5),
                        0 0 0 1px rgba(255, 255, 255, 0.05) inset,
                        0 1px 0 rgba(255, 255, 255, 0.1) inset
                    `,
                    color: '#ffffff',
                    textAlign: 'center',
                }}
            >
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.5, type: 'spring', stiffness: 200 }}
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        background: 'rgba(255, 80, 80, 0.15)',
                        border: '1px solid rgba(255, 80, 80, 0.3)',
                        borderRadius: '50px',
                        padding: '0.4rem 1.2rem',
                        marginBottom: '1.5rem',
                        fontSize: '0.85rem',
                        fontWeight: 500,
                        color: '#ff6b6b',
                    }}
                >
                    <span style={{ 
                        width: 8, 
                        height: 8, 
                        borderRadius: '50%', 
                        background: '#ff4444',
                        boxShadow: '0 0 12px #ff4444',
                        display: 'inline-block'
                    }} />
                    404 ERROR
                </motion.div>

                <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6, duration: 0.6 }}
                    style={{
                        fontSize: 'clamp(1.8rem, 4vw, 2.6rem)',
                        fontWeight: 700,
                        margin: '0 0 0.8rem 0',
                        background: 'linear-gradient(135deg, #ffffff 0%, #aaccff 50%, #8899cc 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                        letterSpacing: '-0.02em',
                        lineHeight: 1.2,
                    }}
                >
                    Lost in the Void
                </motion.h1>

                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8, duration: 0.6 }}
                    style={{
                        color: 'rgba(200, 210, 240, 0.9)',
                        fontSize: '1rem',
                        lineHeight: 1.6,
                        margin: '0 0 2rem 0',
                        fontWeight: 400,
                    }}
                >
                    The page you're looking for has drifted into deep space.
                    <br />
                    It may have been moved, renamed, or never existed.
                </motion.p>

                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.0, duration: 0.5 }}
                    style={{
                        display: 'flex',
                        gap: '1rem',
                        justifyContent: 'center',
                        flexWrap: 'wrap',
                        marginBottom: '1.8rem',
                    }}
                >
                    <motion.button
                        whileHover={{ scale: 1.03, y: -2 }}
                        whileTap={{ scale: 0.97 }}
                        style={{
                            padding: '0.85rem 2rem',
                            borderRadius: '14px',
                            border: 'none',
                            background: 'linear-gradient(135deg, #3b5de7 0%, #5b7df5 100%)',
                            color: '#ffffff',
                            fontWeight: 600,
                            fontSize: '0.95rem',
                            cursor: 'pointer',
                            boxShadow: '0 8px 24px rgba(59, 93, 231, 0.35)',
                            letterSpacing: '0.01em',
                            transition: 'box-shadow 0.3s',
                        }}
                        onClick={() => window.location.href = '/'}
                    >
                        ← Back to Dashboard
                    </motion.button>
                    
                    <motion.button
                        whileHover={{ scale: 1.03, y: -2 }}
                        whileTap={{ scale: 0.97 }}
                        style={{
                            padding: '0.85rem 2rem',
                            borderRadius: '14px',
                            border: '1px solid rgba(255, 255, 255, 0.25)',
                            background: 'rgba(255, 255, 255, 0.08)',
                            color: '#ffffff',
                            fontWeight: 500,
                            fontSize: '0.95rem',
                            cursor: 'pointer',
                            backdropFilter: 'blur(8px)',
                            letterSpacing: '0.01em',
                            transition: 'background 0.3s, border-color 0.3s',
                        }}
                        onClick={() => window.history.back()}
                    >
                        Go Back
                    </motion.button>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.2, duration: 0.5 }}
                    style={{
                        display: 'flex',
                        gap: '0.6rem',
                        justifyContent: 'center',
                        flexWrap: 'wrap',
                    }}
                >
                    {['Graph-Editor', 'Dashboard', 'Terminal', 'Documentation'].map((item: string) => (
                        <motion.a
                            key={item}
                            href={`/${item.toLowerCase()}`}
                            whileHover={{ 
                                scale: 1.05, 
                                background: 'rgba(255, 255, 255, 0.15)',
                                borderColor: 'rgba(255, 255, 255, 0.4)'
                            }}
                            style={{
                                padding: '0.5rem 1.2rem',
                                borderRadius: '50px',
                                border: '1px solid rgba(255, 255, 255, 0.15)',
                                background: 'rgba(255, 255, 255, 0.05)',
                                color: 'rgba(220, 225, 245, 0.9)',
                                fontSize: '0.85rem',
                                fontWeight: 500,
                                textDecoration: 'none',
                                cursor: 'pointer',
                                backdropFilter: 'blur(4px)',
                                transition: 'all 0.2s',
                            }}
                        >
                            {item}
                        </motion.a>
                    ))}
                </motion.div>
            </motion.div>
        </div>
    );
};

const NotFoundPage = (): React.ReactElement => {
    return (
        <div style={{ 
            width: '100vw', 
            height: '100vh', 
            overflow: 'hidden',
            fontFamily: "'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif",
            background: '#0a0a1a'
        }}>
            <ThreeBackground />
            <GlassUI />
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
                * { box-sizing: border-box; margin: 0; padding: 0; }
                body { margin: 0; overflow: hidden; }
            `}</style>
        </div>
    );
};

export default NotFoundPage;