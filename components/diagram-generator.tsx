"use client";
import React, { useEffect, useRef } from "react";
import mermaid from "mermaid";

interface DiagramGeneratorProps {
  mermaidCode: string;
}

export default function DiagramGenerator({ mermaidCode }: DiagramGeneratorProps) {
  const mermaidRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (mermaidRef.current) {
      mermaid.render(`mermaid-${Date.now()}`, mermaidCode).then((result) => {
        if (mermaidRef.current) {
          mermaidRef.current.innerHTML = result.svg;
          const svg = mermaidRef.current.querySelector('svg');
          if (svg) {
            svg.style.display = 'block';
            svg.style.margin = 'auto';
          }
        }
      });
    }
  }, [mermaidCode]);

  return <div ref={mermaidRef} className="mermaid w-full h-full flex items-center justify-center"/>;
}
