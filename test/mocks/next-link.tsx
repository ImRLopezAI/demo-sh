import * as React from 'react'

type LinkProps = Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & {
	href: string | URL
}

const NextLink = React.forwardRef<HTMLAnchorElement, LinkProps>(
	({ href, ...props }, ref) => (
		<a
			ref={ref}
			href={typeof href === 'string' ? href : href.toString()}
			{...props}
		/>
	),
)

NextLink.displayName = 'NextLinkMock'

export default NextLink
