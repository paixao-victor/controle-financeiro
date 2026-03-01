import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';

interface UserAvatarProps {
    size?: string;
    className?: string;
    onClick?: () => void;
    showEditBadge?: boolean;
}

const RAINBOW_STOPS = [
    "#FF0000", "#FF7700", "#FFEE00", "#00CC00",
    "#0088FF", "#8800FF", "#FF0088", "#FF0000",
];

const UserAvatar: React.FC<UserAvatarProps> = ({ 
    size = 'size-12', 
    className = '', 
    onClick,
    showEditBadge = false
}) => {
    const { user } = useAuth();
    const { theme } = useTheme();

    if (!user) return null;

    const { photo, name, useInitials, photoBorder } = user;
    
    const getInitials = (name: string) => {
        if (!name) return '??';
        const parts = name.trim().split(' ');
        if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    };

    const resolvedBorderColor = () => {
        if (!photoBorder || !photoBorder.show) return 'transparent';
        if (photoBorder.type === 'rainbow') return 'rainbow';
        if (photoBorder.color === 'auto') {
            return theme === 'dark' ? '#ffffff' : '#000000';
        }
        return photoBorder.color;
    };

    const borderColor = resolvedBorderColor();
    const borderWidth = photoBorder?.width || 0;

    const renderContent = () => {
        if (useInitials || !photo) {
            return (
                <div className="size-full flex items-center justify-center bg-surface-dark/5 dark:bg-white/5 text-primary font-black uppercase" style={{ containerType: 'inline-size' }}>
                    <span style={{ fontSize: '45cqw', lineHeight: 1 }}>
                        {getInitials(name)}
                    </span>
                </div>
            );
        }

        return (
            <img 
                src={photo} 
                alt={name} 
                className="size-full object-cover"
                onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                    (e.target as HTMLImageElement).parentElement?.classList.add('fallback-initials');
                }}
            />
        );
    };

    return (
        <div 
            onClick={onClick}
            className={`relative rounded-full shrink-0 select-none ${size} ${onClick ? 'cursor-pointer' : ''} ${className}`}
            style={{ 
                '--avatar-size': '100%',
                padding: photoBorder?.show ? `${(borderWidth / 400) * 100}%` : '0',
                background: (photoBorder?.show && borderColor === 'rainbow') 
                    ? `conic-gradient(${RAINBOW_STOPS.join(',')})` 
                    : (photoBorder?.show ? borderColor : 'transparent')
            } as any}
        >
            {/* Avatar Content Wrapper */}
            <div className={`relative size-full rounded-full overflow-hidden bg-background ${photoBorder?.show ? 'border-2 border-background' : ''}`} style={{ containerType: 'inline-size' }}>
                {renderContent()}
            </div>

            {/* Edit Badge */}
            {showEditBadge && (
                <div className="absolute bottom-0 right-0 size-1/3 bg-primary rounded-full border-2 border-background flex items-center justify-center text-secondary shadow-lg">
                    <span className="material-symbols-outlined text-[14px]!">edit</span>
                </div>
            )}
        </div>
    );
};

export default UserAvatar;
