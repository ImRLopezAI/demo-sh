# Page Compound Component

It would be helpful to have a compound component for pages that have a similar structure to MS Dynamics Business Central, where there is a header with actions and a grid below. This would allow us to standardize the layout and make it easier to create new pages with this structure.

Props:
- title: string - The title of the page
- description: string - A brief description of the page
- module: Derived from the Convex API - The module that the page belongs to
- entity: Derived from the Convex API/module - The main entity that the page is displaying or interacting with
- type: 'list' | 'details' | 'worksheet' | 'dashboard' | 'form' - The type of page, which can be used to determine the layout and components to use
- children: React.ReactNode - The content of the page, which can include Components based on the type of page and base on the type the page should be type safe and only allow components that are relevant to the type of page being rendered
	- List:
		- Page.Actions: A component for rendering action buttons in the header
		- Page.Grid: A component for rendering a data grid or table in the main content area this must be data grid instance from the module
	- Details:
		- Page.Actions: A component for rendering action buttons in the header
		- Page.Details: A component for rendering detailed information about a single record
		- Page.Form: A component for rendering a form for editing or creating a record
	- Worksheet:
		- Page.Actions: A component for rendering action buttons in the header
		- Page.Worksheet: A component for rendering a worksheet or form for data entry or editing
	- Dashboard:
		- Page.Chart: A component for rendering a dashboard with various widgets and visualizations


Key Features:
- Consistent page structure and layout across different types of pages TYPESAFE base on the type prop and module/entity information
- Standardized layout for different types of pages (list, details, worksheet, dashboard)
- Easy to create new pages with a consistent structure and design
- Integration with the Convex API to automatically derive module and entity information
- Flexible components for actions, grids, details, worksheets, and dashboards that can be customized based on the needs of each page

you can use
``` ts
import { mergeProps } from '@base-ui/react/merge-props'
import { useRender } from '@base-ui/react/use-render'
```
to handle the props and rendering logic for the Page component and its subcomponents. This will allow you to create a clean and efficient implementation of the compound component while ensuring that it is easy to use and customize for different types of pages.

# List Page
The List page is designed to display a list of records in a data grid or table format. It includes a header with action buttons and a main content area for the grid.

```tsx
<Page
	title="Bank Accounts"
	description="List of all bank accounts in the system"
	module="Banking"
	entity="BankAccount"
	type="list"
>
	<Page.Actions render={() => {
		//  Actions
	}} />
	<Page.Grid>
	{/* grid instance components will be rendered here */}
	</Page.Grid>
</Page>
```
# Details Page
The Details page is designed to display detailed information about a single record. It includes a header with action buttons and a main content area for the details.


```tsx
<Page
	title="Bank Account Details"
	description="Detailed information about the selected bank account"
	module="Banking"
	entity="BankAccount"
	type="details"
>
	<Page.Actions render={() => {
		//  Actions
	}} />
	<Page.Details>
	{/* details components will be rendered here */}
	</Page.Details>
	</Page>
```

```tsx
import {banKAccount} from '@server/convex/flow'
<Page
	title="Bank Account Details"
	description="Detailed information about the selected bank account"
	module="Banking"
	entity="BankAccount"
	type="details"
	properties={{
		insertSchema: bankAccount.insertSchema,
		updateSchema: bankAccount.updateSchema,
		id: 
	}}
>
	<Page.Actions render={() => {
		//  Actions
	}} />
	<Page.Form size="md" onHandleSubmit={(data, form) => {

	}} />
</Page>
```

# Dashboard Page
The Dashboard page is designed to display various widgets and visualizations related to a specific module or entity. It includes a header with action buttons and a main content area for the dashboard components.

props:
- type: 'line' | 'bar' | 'pie' | 'radial' - The type of dashboard to render, which can be used to determine the layout and components to use for the dashboard
- config: object - A configuration object for the Chart

```tsx
<Page
	title="Sales Dashboard"
	description="Overview of sales performance and metrics"
	module="Sales"
	entity="SalesOrder"
	type="dashboard"
>
	<Page.Actions render={() => {
		//  Actions
	}} />
	<Page.Chart type="line" config={(data) => ({
		// chart configuration based on the data
	})} />
	<Page.Chart type="line" config={(data) => ({
		// chart configuration based on the data
	})} />
	<Page.Chart type="line" config={(data) => ({
		// chart configuration based on the data
	})} />
	<Page.Chart type="line" config={(data) => ({
		// chart configuration based on the data
	})} />
</Page>
```

# Worksheet Page
The Worksheet page is designed for data entry or editing, allowing users to interact with forms and worksheets related to a specific module or entity. It includes a header with action buttons and a main content area for the worksheet components.

```tsx
<Page
	title="Sales Order Worksheet"
	description="Create or edit sales orders using the worksheet"
	module="Sales"
	entity="SalesOrder"
	type="worksheet"
>
	<Page.Actions render={() => {
		//  Actions
	}} />
	<Page.Worksheet>
	<Page.Worksheet.Sub>
	{/* Sub components for the worksheet, such as forms, grids, or other interactive elements */}
	</Page.Worksheet.Sub>
	
	<Page.Worksheet.Sub>
	{/* Sub components for the worksheet, such as forms, grids, or other interactive elements */}
	</Page.Worksheet.Sub>
	
	<Page.Worksheet.Sub>
	{/* Sub components for the worksheet, such as forms, grids, or other interactive elements */}
	</Page.Worksheet.Sub>
	
	</Page.Worksheet>
</Page>