import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { MMDLoader, VMDLoader, buildAnimation } from '@moeru/three-mmd'
import { useForceIgnoreMouse } from '@/hooks/utils/use-force-ignore-mouse'
import { useMMDAnimation } from '@/hooks/canvas/use-mmd-animation'

interface MMDModelProps {
    pmxUrl: string
    isPet?: boolean
    petOffsetY?: number
}

export function MMDModel({ pmxUrl, isPet, petOffsetY = 0 }: MMDModelProps) {
    const mountRef = useRef<HTMLDivElement>(null)
    const { forceIgnoreMouse } = useForceIgnoreMouse()
    const { currentVmdUrl } = useMMDAnimation()

    // Refs compartidas entre effects
    const mmdMeshRef = useRef<any>(null)
    const mixerRef = useRef<THREE.AnimationMixer | null>(null)
    const clockRef = useRef(new THREE.Clock())

    // Effect para cargar VMD cuando cambia currentVmdUrl
    useEffect(() => {
        if (!mmdMeshRef.current || !currentVmdUrl) return

        const vmdLoader = new VMDLoader()
        vmdLoader.load(
            currentVmdUrl,
            (vmd) => {
                const animation = buildAnimation(vmd, mmdMeshRef.current)
                animation.name = 'motion'
                if (mixerRef.current) {
                    mixerRef.current.stopAllAction()
                }
                const mixer = new THREE.AnimationMixer(mmdMeshRef.current)
                mixer.clipAction(animation).play()
                mixerRef.current = mixer
                console.log('[MMDModel] VMD loaded:', currentVmdUrl)
            },
            undefined,
            (error) => console.error('[MMDModel] VMD error:', error),
        )
    }, [currentVmdUrl])

    // Effect principal para Three.js y modelo PMX
    useEffect(() => {
        const mount = mountRef.current
        if (!mount) return

        const width = mount.clientWidth || window.innerWidth
        const height = mount.clientHeight || window.innerHeight

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
        renderer.setSize(width, height)
        renderer.setPixelRatio(window.devicePixelRatio)
        renderer.domElement.style.pointerEvents = 'none'
        mount.appendChild(renderer.domElement)

        const scene = new THREE.Scene()

        const zDistance = isPet ? 150 : 35
        const cameraY = isPet ? 10.27 + (petOffsetY * 0.01) : 10.27

        const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000)
        camera.position.set(0, cameraY, zDistance)
        camera.lookAt(0, cameraY, 0)

        scene.add(new THREE.AmbientLight(0xffffff, 1.5))
        const dirLight = new THREE.DirectionalLight(0xffffff, 1)
        dirLight.position.set(5, 10, 5)
        scene.add(dirLight)

        const loader = new MMDLoader()
        loader.load(
            pmxUrl,
            (mmd) => {
                console.log('[MMDModel] Model loaded!')
                mmd.mesh.scale.setScalar(1)
                mmd.mesh.position.set(0, 0, 0)
                scene.add(mmd.mesh)
                mmdMeshRef.current = mmd.mesh

                // Cargar VMD inicial
                if (currentVmdUrl) {
                    const vmdLoader = new VMDLoader()
                    vmdLoader.load(
                        currentVmdUrl,
                        (vmd) => {
                            const animation = buildAnimation(vmd, mmd.mesh)
                            animation.name = 'motion'
                            const mixer = new THREE.AnimationMixer(mmd.mesh)
                            mixer.clipAction(animation).play()
                            mixerRef.current = mixer
                        },
                        undefined,
                        (error) => console.error('[MMDModel] VMD error:', error),
                    )
                }
            },
            (progress) => console.log('[MMDModel] Loading:', Math.round(100 * progress.loaded / progress.total) + '%'),
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
            const delta = clockRef.current.getDelta()
            if (mixerRef.current) {
                mixerRef.current.update(delta)
            }
            renderer.render(scene, camera)
        }
        animate()

        return () => {
            cancelAnimationFrame(animId)
            window.removeEventListener('resize', handleResize)
            mount.removeChild(renderer.domElement)
            renderer.dispose()
            mmdMeshRef.current = null
            mixerRef.current = null
        }
    }, [pmxUrl, isPet, petOffsetY])

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