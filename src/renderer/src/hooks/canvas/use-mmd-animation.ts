import { create } from 'zustand'

interface MMDAnimationState {
    currentVmdUrl: string
    setCurrentVmdUrl: (url: string) => void
}

export const useMMDAnimation = create<MMDAnimationState>(set => ({
    currentVmdUrl: '/models/suisei/standing.vmd',
    setCurrentVmdUrl: (url) => set({ currentVmdUrl: url }),
}))

// Mapeo de expresiones a VMDs
// export const expressionToVmd: Record<string, string> = {
//     'thinking': '/models/suisei/thinking.vmd',
//     'waiting': '/models/suisei/waiting_.vmd',
//     'yawning': '/models/suisei/yawning.vmd',
//     'default': '/models/suisei/standing.vmd',
// }

export const expressionToVmd: Record<string, string> = {
    '0': '/models/suisei/standing.vmd',
    '1': '/models/suisei/thinking.vmd',
    '2': '/models/suisei/waiting_.vmd',
    '3': '/models/suisei/yawning.vmd',
    'default': '/models/suisei/standing.vmd',
}