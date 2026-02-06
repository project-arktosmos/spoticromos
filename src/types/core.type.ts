export type ID = string | number;

export enum ThemeColors {
	Primary = 'primary',
	Secondary = 'secondary',
	Accent = 'accent',
	Success = 'success',
	Error = 'error',
	Info = 'info',
	Warning = 'warning',
	Neutral = 'neutral'
}

export const ColorsToText: Record<ThemeColors, string> = {
	[ThemeColors.Primary]: 'text-primary',
	[ThemeColors.Secondary]: 'text-secondary',
	[ThemeColors.Accent]: 'text-accent',
	[ThemeColors.Success]: 'text-success',
	[ThemeColors.Error]: 'text-error',
	[ThemeColors.Info]: 'text-info',
	[ThemeColors.Warning]: 'text-warning',
	[ThemeColors.Neutral]: ''
};

export enum ThemeSizes {
	XSmall = 'xs',
	Small = 'sm',
	Medium = 'md',
	Large = 'lg',
	XLarge = 'xl'
}