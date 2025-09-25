import { useCallback } from "react";
import Particles from "react-tsparticles";
import { loadFull } from "tsparticles";

export default function LoginParticlesBackground({ className = "" }) {
    const particlesInit = useCallback(async (engine) => {
        await loadFull(engine);
    }, []);

    return (
        <div className={`absolute inset-0 z-0 ${className}`}>
            <Particles
                id="login-particles"
                init={particlesInit}
                options={{
                    background: { color: { value: "#f8fafc" } },
                    fpsLimit: 60,
                    particles: {
                        color: { value: "#2563eb" },
                        links: { enable: true, color: "#2563eb", distance: 120, opacity: 0.3 },
                        move: { enable: true, speed: 1.5, direction: "none", outModes: { default: "bounce" } },
                        number: { value: 40, density: { enable: true, area: 800 } },
                        opacity: { value: 0.5 },
                        shape: { type: "circle" },
                        size: { value: { min: 2, max: 6 } },
                    },
                    detectRetina: true,
                }}
                style={{ width: "100vw", height: "100vh" }}
            />
        </div>
    );
}