"use client"

import { useState } from "react"
import { X } from "lucide-react"

interface CoverModalProps {
  isOpen: boolean
  onClose: () => void
  currentCover: {
    color?: string
    image?: string
    size?: 'small' | 'large'
  }
  onCoverChange: (cover: { color?: string; image?: string; size?: 'small' | 'large' }) => void
}

export default function CoverModal({
  isOpen,
  onClose,
  currentCover,
  onCoverChange
}: CoverModalProps) {
  const [selectedSize, setSelectedSize] = useState<'small' | 'large'>(currentCover.size || 'small')
  const [selectedColor, setSelectedColor] = useState<string>(currentCover.color || '#3B82F6')

  const colors = [
    "#10B981", // green
    "#F59E0B", // yellow
    "#F97316", // orange
    "#EF4444", // red
    "#8B5CF6", // purple
    "#3B82F6", // blue
    "#06B6D4", // cyan
    "#84CC16", // lime
    "#EC4899", // pink
    "#6B7280", // gray
    "#1F2937", // dark gray
    "#F3F4F6", // light gray
  ]

  const handleSave = () => {
    onCoverChange({
      color: selectedColor,
      size: selectedSize
    })
    onClose()
  }

  const handleRemove = () => {
    onCoverChange({})
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Cover</h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-6">
          {/* Size Section */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">Size</h3>
            <div className="grid grid-cols-2 gap-3">
              <div
                className={`border-2 rounded-lg p-3 cursor-pointer transition-all ${
                  selectedSize === 'small' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setSelectedSize('small')}
              >
                <div className="space-y-2">
                  <div 
                    className="h-8 rounded"
                    style={{ backgroundColor: selectedColor }}
                  />
                  <div className="h-2 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-2 bg-gray-200 rounded w-1/2"></div>
                </div>
                {selectedSize === 'small' && (
                  <div className="w-3 h-3 bg-blue-500 rounded-full mt-2 ml-auto"></div>
                )}
              </div>
              
              <div
                className={`border-2 rounded-lg p-3 cursor-pointer transition-all ${
                  selectedSize === 'large' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setSelectedSize('large')}
              >
                <div className="space-y-2">
                  <div 
                    className="h-16 rounded"
                    style={{ backgroundColor: selectedColor }}
                  />
                  <div className="h-2 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-2 bg-gray-200 rounded w-1/2"></div>
                </div>
                {selectedSize === 'large' && (
                  <div className="w-3 h-3 bg-blue-500 rounded-full mt-2 ml-auto"></div>
                )}
              </div>
            </div>
          </div>

          {/* Colors Section */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">Colors</h3>
            <div className="grid grid-cols-6 gap-2">
              {colors.map((color) => (
                <button
                  key={color}
                  onClick={() => setSelectedColor(color)}
                  className={`w-10 h-10 rounded border-2 transition-all ${
                    selectedColor === color ? 'border-gray-900 scale-110' : 'border-gray-300 hover:border-gray-400'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-gray-200 space-y-2">
          <button
            onClick={handleSave}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium"
          >
            Save
          </button>
          <button
            onClick={handleRemove}
            className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm font-medium"
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  )
}
