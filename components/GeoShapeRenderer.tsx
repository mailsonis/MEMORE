
import React from 'react';
import { ShapeType, ColoringScheme, GeoShape } from '../types';

interface GeoShapeRendererProps {
  shape: GeoShape;
  size?: number;
  className?: string;
  onClick?: () => void;
  isSelected?: boolean;
  status?: 'correct' | 'wrong' | 'none';
}

const GeoShapeRenderer: React.FC<GeoShapeRendererProps> = ({ 
  shape, 
  size = 100, 
  className = "", 
  onClick,
  isSelected = false,
  status = 'none'
}) => {
  const getPath = (type: ShapeType): string => {
    switch (type) {
      case ShapeType.SQUARE:
        return "M10,10 L90,10 L90,90 L10,90 Z";
      case ShapeType.CIRCLE:
        return "M50,50 m-40,0 a40,40 0 1,0 80,0 a40,40 0 1,0 -80,0";
      case ShapeType.TRIANGLE:
        return "M50,15 L90,85 L10,85 Z";
      case ShapeType.PENTAGON:
        return "M50,10 L90,40 L75,85 L25,85 L10,40 Z";
      case ShapeType.HEXAGON:
        return "M50,10 L85,30 L85,70 L50,90 L15,70 L15,30 Z";
      case ShapeType.STAR:
        return "M50,10 L61,35 L88,35 L66,52 L75,78 L50,62 L25,78 L34,52 L12,35 L39,35 Z";
      default:
        return "";
    }
  };

  const renderFills = () => {
    const { scheme, colors } = shape;
    const clipPathId = `clip-${shape.id}`;
    
    return (
      <>
        <defs>
          <clipPath id={clipPathId}>
            <path d={getPath(shape.type)} />
          </clipPath>
        </defs>
        
        <g clipPath={`url(#${clipPathId})`}>
          {scheme === ColoringScheme.SOLID && (
            <rect width="100" height="100" fill={colors[0]} />
          )}
          
          {scheme === ColoringScheme.VERTICAL_HALF && (
            <>
              <rect width="50" height="100" fill={colors[0]} />
              <rect x="50" width="50" height="100" fill={colors[1]} />
            </>
          )}
          
          {scheme === ColoringScheme.HORIZONTAL_HALF && (
            <>
              <rect width="100" height="50" fill={colors[0]} />
              <rect y="50" width="100" height="50" fill={colors[1]} />
            </>
          )}
          
          {scheme === ColoringScheme.QUARTERS && (
            <>
              <rect width="50" height="50" fill={colors[0]} />
              <rect x="50" width="50" height="50" fill={colors[1]} />
              <rect y="50" width="50" height="50" fill={colors[2]} />
              <rect x="50" y="50" width="50" height="50" fill={colors[3]} />
            </>
          )}
        </g>
      </>
    );
  };

  const statusBorder = status === 'correct' 
    ? 'border-4 border-green-500 shadow-lg shadow-green-500/20' 
    : status === 'wrong' 
    ? 'border-4 border-red-500 shadow-lg shadow-red-500/20'
    : isSelected 
    ? 'border-4 border-blue-400 shadow-lg shadow-blue-400/20' 
    : 'border-2 border-transparent';

  return (
    <div 
      className={`relative cursor-pointer transition-all duration-200 transform hover:scale-105 bg-slate-800/50 rounded-xl p-2 flex items-center justify-center ${statusBorder} ${className}`}
      style={{ width: size, height: size }}
      onClick={onClick}
    >
      <svg 
        viewBox="0 0 100 100" 
        className="w-full h-full drop-shadow-md"
      >
        {renderFills()}
      </svg>
    </div>
  );
};

export default GeoShapeRenderer;
