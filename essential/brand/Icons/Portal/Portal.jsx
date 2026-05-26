export default function PortalIcon({ style, ...props }) {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			xmlnsXlink="http://www.w3.org/1999/xlink"
			aria-hidden="true"
			role="img"
			width="512"
			height="512"
			viewBox="0 0 8 8"
			style={{ color: 'rgb(255, 255, 255)', ...style }}
			{...props}
		>
			<path fill="currentColor" d="M4 8V3h4v5M0 8V5h3v3m1-6V0h4v2M0 4V0h3v4" />
		</svg>
	)
}
