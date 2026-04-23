import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { MMDLoader } from '@moeru/three-mmd'

interface MMDModelProps {
    pmxUrl: string
}

export function MMDModel({ pmxUrl }: MMDModelProps) {
    const mountRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const mount = mountRef.current
        if (!mount) return

        const width = mount.clientWidth || window.innerWidth
        const height = mount.clientHeight || window.innerHeight

        console.log('[MMDModel] mount size:', width, height)

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
        renderer.setSize(width, height)
        renderer.setPixelRatio(window.devicePixelRatio)
        renderer.domElement.style.pointerEvents = 'none'
        mount.appendChild(renderer.domElement)

        const scene = new THREE.Scene()

        const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000)
        camera.position.set(0, 10.27, 40)
        camera.lookAt(0, 10.27, 0)

        scene.add(new THREE.AmbientLight(0xffffff, 1.5))
        const dirLight = new THREE.DirectionalLight(0xffffff, 1)
        dirLight.position.set(5, 10, 5)
        scene.add(dirLight)

        // Mesh de prueba para verificar que Three.js funciona
        const testMesh = new THREE.Mesh(
            new THREE.BoxGeometry(2, 2, 2),
            new THREE.MeshStandardMaterial({ color: 0xff0000 }),
        )
        scene.add(testMesh)

        const loader = new MMDLoader()
        loader.load(
            pmxUrl,
            (mmd) => {
                console.log('[MMDModel] Model loaded successfully!')
                scene.remove(testMesh)
                mmd.mesh.scale.setScalar(1)
                mmd.mesh.position.set(0, 0, 0)
                scene.add(mmd.mesh)

                // Log bounding box para saber dónde está el modelo
                const box = new THREE.Box3().setFromObject(mmd.mesh)
                const size = box.getSize(new THREE.Vector3())
                const center = box.getCenter(new THREE.Vector3())
                console.log('[MMDModel] Bounding box size:', size)
                console.log('[MMDModel] Bounding box center:', center)
            },
            (progress) => {
                console.log('[MMDModel] Loading:', Math.round(100 * progress.loaded / progress.total) + '%')
            },
            (error) => console.error('[MMDModel] Error:', error),
        )

        const handleResize = () => {
            const w = mount.clientWidth || window.innerWidth
            const h = mount.clientHeight || window.innerHeight
            camera.aspect = w / h
            camera.updateProjectionMatrix()
            renderer.setSize(w, h)
        }
        window.addEventListener('resize', handleResize)

        let animId: number
        const animate = () => {
            animId = requestAnimationFrame(animate)
            testMesh.rotation.y += 0.01
            renderer.render(scene, camera)
        }
        animate()

        return () => {
            cancelAnimationFrame(animId)
            window.removeEventListener('resize', handleResize)
            mount.removeChild(renderer.domElement)
            renderer.dispose()
        }
    }, [pmxUrl])

    return (
        <div
            ref={mountRef}
            style={{
                width: '100%',
                height: '100%',
                position: 'absolute',
                top: 0,
                left: 0,
                zIndex: 6,
                pointerEvents: 'none',
            }}
        />
    )
}