'use client'

import { ReactNode } from 'react'
import { HashbrownProvider } from '@hashbrownai/react'

export default function GerezaLayout({ children }: { children: ReactNode }) {
    return (
        <HashbrownProvider url="/api/hashbrown">
            {children}
        </HashbrownProvider>
    )
}
