# Requirements Document

## Introduction

Sri Crackers is a crackers (fireworks) retail business operating under the tagline "Quality Crackers at Sivakasi Wholesale Rate". This feature delivers a production-ready, mobile-first online ordering website that lets customers browse a fixed catalogue of 186 products, add items to a cart with enforced minimum quantities, review a live order total, submit contact and delivery details, and receive an order confirmation while the business owner receives a formatted order email.

The authoritative source of all product data is the attached "Sri Crackers 2026 Price List" PDF, which contains exactly 186 products. Product identity, names, categories, prices, units, and minimum quantities MUST originate solely from this PDF. No product data may be invented, omitted, or altered.

The solution MUST NOT use any Amazon Web Services (AWS) components anywhere (including but not limited to SES, Lambda, S3). Email delivery and backend configuration MUST use a non-AWS backend or serverless approach configured through environment variables.

## Glossary

- **System**: The complete Sri Crackers online ordering web application, including frontend and non-AWS backend.
- **Catalogue**: The collection of all 186 products sourced from the Sri Crackers 2026 Price List PDF.
- **Price_List_PDF**: The attached "Sri Crackers 2026 Price List" document that is the single source of truth for product data.
- **Product**: A single catalogue item defined by id, name, category, price, unit, and minimumQuantity.
- **Product_Data_File**: The structured data file `products.json` holding all 186 Product records.
- **Catalogue_UI**: The frontend component that renders the Catalogue and product cards.
- **Product_Card**: The compact visual element representing a single Product in the Catalogue_UI.
- **Search_Component**: The frontend component that filters the Catalogue by product name and category.
- **Category_Filter**: The frontend control (horizontally scrollable chips) that filters the Catalogue by category.
- **Cart**: The customer's current selection of products and quantities, with computed totals.
- **Cart_Bar**: The sticky bottom bar on mobile showing item count, grand total, and a view action.
- **Cart_Page**: The dedicated page listing cart line items with per-line and overall totals.
- **Checkout_Component**: The frontend component collecting customer contact and delivery details ("Your Details").
- **Order**: A submitted purchase containing customer details, line items, and computed totals.
- **Order_ID**: A unique, never-reused reference for an Order in the format `SC-2026-NNNNN`.
- **Order_Validator**: The logic that validates Order data on the client and on the backend.
- **Email_Service**: The non-AWS backend/serverless API that sends the owner notification email.
- **Owner_Email**: The business owner email address configured via environment variable.
- **Confirmation_Component**: The frontend view shown after a successful Order submission.
- **Bottom_Navigation**: The mobile bottom navigation bar with Home, Categories, Search, and Cart.
- **Grand_Total**: The sum of all line-item amounts in the Cart or Order, in Indian Rupees (₹).
- **Line_Item**: A single Product entry in the Cart or Order with quantity, unit price, and line total.
- **Minimum_Quantity**: The lowest allowed order quantity for a Product, taken from the Price_List_PDF.

## Requirements

### Requirement 1: Mobile-First Home Page

**User Story:** As a customer on a mobile phone, I want an attractive festive home page, so that I understand the Sri Crackers brand and can quickly start browsing or view my cart.

#### Acceptance Criteria

1. THE System SHALL render the home page with a mobile viewport width as the primary layout target.
2. THE System SHALL display a header containing the Sri Crackers logo, the business name "Sri Crackers", a search icon, and a cart icon.
3. THE System SHALL display a cart item count badge on the cart icon showing the total number of distinct products in the Cart.
4. THE System SHALL display a hero section containing the title "🎆 Sri Crackers", the tagline "Quality Crackers at Sivakasi Wholesale Rate", a primary call-to-action labelled "Browse Crackers", and a secondary call-to-action labelled "View Cart".
5. WHEN the customer activates the "Browse Crackers" call-to-action, THE System SHALL navigate to the Catalogue_UI.
6. WHEN the customer activates the "View Cart" call-to-action, THE System SHALL navigate to the Cart_Page.
7. THE System SHALL render firework-inspired decorative animations in the hero section that complete initial render within 2 seconds on a mid-range mobile device.
8. THE System SHALL apply a distinct festive premium visual identity to the home page that differs from a default e-commerce template layout.

### Requirement 2: Product Catalogue

**User Story:** As a customer, I want to browse and filter all available crackers, so that I can find the products I want to order.

#### Acceptance Criteria

1. WHEN the Catalogue_UI loads, THE Catalogue_UI SHALL display all 186 products sourced only from the Product_Data_File.
2. THE Catalogue_UI SHALL render each Product's name, category, price, unit, and minimumQuantity sourced only from the Product_Data_File.
3. THE Catalogue_UI SHALL map each Product's detailed data category to exactly one grouped chip label from the set {"Sound", "Flower", "Rocket", "Kids", "Fancy", "Sparklers", "Gift"} using a fixed mapping, such that every one of the 186 products is assigned to exactly one grouped chip label.
4. WHEN the customer enters text in the Search_Component, THE Catalogue_UI SHALL display only products whose name contains the entered text as a case-insensitive substring.
5. IF the entered search text matches no product names, THEN THE Catalogue_UI SHALL display zero Product_Cards and display an empty-state message indicating no matching products were found.
6. THE Category_Filter SHALL display exactly the category chips "All", "Sound", "Flower", "Rocket", "Kids", "Fancy", "Sparklers", and "Gift", in that order.
7. THE Category_Filter SHALL render the category chips in a single horizontally scrollable row.
8. WHEN the Catalogue_UI loads, THE Category_Filter SHALL set the "All" chip as the selected chip.
9. WHEN the customer selects a category chip other than "All", THE Catalogue_UI SHALL display only products whose mapped grouped chip label equals the selected chip label.
10. WHEN the customer selects the "All" category chip, THE Catalogue_UI SHALL display all 186 products.
11. WHEN the customer adds a Product to the Cart from a Product_Card, THE System SHALL add the Product to the Cart with the quantity shown on the Product_Card, defaulting to the Product's Minimum_Quantity when the customer has not changed it.
12. WHEN the customer removes a Product from the Cart, THE System SHALL remove the corresponding Line_Item from the Cart.
13. IF the customer attempts to set a Product quantity below the Product's Minimum_Quantity, THEN THE System SHALL reject the change, retain the quantity at the Minimum_Quantity, and display an indication that the Minimum_Quantity applies.

### Requirement 3: Mobile Product Card

**User Story:** As a customer on a small screen, I want compact, touch-friendly product cards, so that I can view products and add them to my cart easily with one hand.

#### Acceptance Criteria

1. THE Catalogue_UI SHALL arrange Product_Cards in a 2-column grid on mobile viewports.
2. THE Product_Card SHALL display the product name, category, price, unit, and Minimum_Quantity.
3. THE Product_Card SHALL display a quantity selector with a decrease control, the current quantity value, and an increase control.
4. THE Product_Card SHALL display an "Add to Cart" button.
5. THE Product_Card SHALL render all interactive controls with a touch target of at least 44 pixels by 44 pixels.
6. WHEN the customer activates the increase control, THE System SHALL increase the Product_Card quantity by one.
7. WHEN the customer activates the decrease control AND the resulting quantity is at or above the Minimum_Quantity, THE System SHALL decrease the Product_Card quantity by one.
8. IF the customer activates the decrease control AND the resulting quantity would fall below the Minimum_Quantity, THEN THE System SHALL keep the quantity at the Minimum_Quantity.

### Requirement 4: Search

**User Story:** As a customer, I want to search for crackers by name quickly, so that I can locate specific products without scrolling through the whole catalogue.

#### Acceptance Criteria

1. THE Search_Component SHALL display a search bar with the placeholder text "🔍 Search crackers...".
2. WHEN the customer types in the Search_Component, THE Catalogue_UI SHALL update the displayed products within 300 milliseconds of the input.
3. THE Search_Component SHALL filter products by matching the entered text against product name and category.
4. IF the Search_Component text matches no products, THEN THE Catalogue_UI SHALL display a friendly empty-state message indicating no matching crackers were found.

### Requirement 5: Cart

**User Story:** As a customer, I want a persistent cart and a clear cart page, so that I can track my selections and totals while I shop and before I check out.

#### Acceptance Criteria

1. WHILE the customer browses the Catalogue_UI, THE Cart_Bar SHALL remain visible at the bottom of the mobile viewport.
2. THE Cart_Bar SHALL display the total item count, the Grand_Total, and a "VIEW" action.
3. WHEN the customer activates the "VIEW" action, THE System SHALL navigate to the Cart_Page.
4. THE Cart_Page SHALL display each Line_Item with its product name, quantity, unit price, and line-item total.
5. WHEN the customer increases a Line_Item quantity on the Cart_Page, THE System SHALL increase the Line_Item quantity by one and recalculate the Line_Item total and the Grand_Total.
6. WHEN the customer decreases a Line_Item quantity on the Cart_Page AND the resulting quantity is at or above the Minimum_Quantity, THE System SHALL decrease the Line_Item quantity by one and recalculate the Line_Item total and the Grand_Total.
7. WHEN the customer removes a Line_Item on the Cart_Page, THE System SHALL remove the Line_Item and recalculate the Cart totals.
8. THE Cart_Page SHALL display the total number of distinct products, the total quantity across all Line_Items, and the Grand_Total.
9. THE System SHALL compute the Grand_Total as the sum of all Line_Item totals, where each Line_Item total equals the product price multiplied by the Line_Item quantity.

### Requirement 6: Minimum Quantity Enforcement

**User Story:** As the business owner, I want minimum order quantities enforced per product, so that orders match the wholesale selling units from the price list.

#### Acceptance Criteria

1. THE System SHALL assign each Product a Minimum_Quantity sourced only from the Price_List_PDF via the Product_Data_File.
2. THE System SHALL assign each Product a unit sourced only from the Price_List_PDF via the Product_Data_File.
3. WHEN a Product is first added to the Cart, THE System SHALL set the initial Line_Item quantity to the Product Minimum_Quantity.
4. IF any quantity change would set a Line_Item quantity below the Product Minimum_Quantity, THEN THE System SHALL keep the quantity at the Minimum_Quantity.

### Requirement 7: Checkout

**User Story:** As a customer, I want a simple mobile checkout form, so that I can provide my delivery details and confirm my order before submitting.

#### Acceptance Criteria

1. THE Checkout_Component SHALL display a page titled "Your Details".
2. THE Checkout_Component SHALL display input fields for Full Name (required), Mobile Number (required), Email (optional), Delivery Address (required), City (optional), Pincode (optional), and Additional Notes (optional).
3. THE Checkout_Component SHALL render all input fields with mobile-friendly dimensions and a touch target of at least 44 pixels in height.
4. BEFORE the Order is submitted, THE Checkout_Component SHALL display an order summary listing each Line_Item with Product, Quantity, Rate, and Amount, plus Total Products, Total Quantity, and Grand_Total.
5. THE Checkout_Component SHALL display a primary submission button labelled "SUBMIT ORDER".

### Requirement 8: Order Validation and Submission

**User Story:** As the business owner, I want submitted orders validated and sanitized, so that I receive complete, trustworthy orders without duplicates.

#### Acceptance Criteria

1. IF the Full Name field is empty or contains only whitespace characters when the customer submits, THEN THE Order_Validator SHALL reject the submission, retain the value the customer entered in the Full Name field, and display a validation message indicating the Full Name field is required.
2. IF the Mobile Number field is empty or contains only whitespace characters when the customer submits, THEN THE Order_Validator SHALL reject the submission, retain the value the customer entered in the Mobile Number field, and display a validation message indicating the Mobile Number field is required.
3. IF the Delivery Address field is empty or contains only whitespace characters when the customer submits, THEN THE Order_Validator SHALL reject the submission, retain the value the customer entered in the Delivery Address field, and display a validation message indicating the Delivery Address field is required.
4. IF the Mobile Number value, after stripping all spaces and hyphens, does not consist of exactly 10 digits with a first digit between 6 and 9 inclusive, THEN THE Order_Validator SHALL reject the submission and display a mobile format validation message.
5. IF the Email field is non-empty AND the Email value does not contain exactly one "@" character, at least one character before the "@", and a domain portion after the "@" containing at least one ".", THEN THE Order_Validator SHALL reject the submission and display an email format validation message.
6. IF the Cart contains zero Line_Items when the customer submits, THEN THE Order_Validator SHALL reject the submission and display a message that the cart is empty.
7. IF any Line_Item quantity is below its Product Minimum_Quantity when the customer submits, THEN THE Order_Validator SHALL reject the submission and display a message that identifies each affected Line_Item and its required Minimum_Quantity.
8. WHILE an Order submission is being processed, THE System SHALL keep the "SUBMIT ORDER" button disabled, and WHEN the submission completes or fails, THE System SHALL re-enable the "SUBMIT ORDER" button within 1 second.
9. WHEN an Order submission reaches the backend, THE Order_Validator SHALL re-apply the validation checks defined in criteria 1 through 7 on the backend, and IF any check fails, THEN THE Order_Validator SHALL reject the submission with a validation error response before processing.
10. WHEN an Order submission reaches the backend, THE System SHALL sanitize all customer-provided input values by stripping or escaping HTML markup so that no HTML tags are interpreted when the values are stored or included in the notification email.
11. IF an Order submission arrives with an idempotency key matching a submission received within the preceding 24-hour window, THEN THE System SHALL return the result of the original submission instead of creating a new Order.
12. THE System SHALL read all secret values from environment variables and SHALL exclude every secret value from the notification email and from any response returned to the customer.

### Requirement 9: Owner Email Notification

**User Story:** As the business owner, I want a formatted email for each order, so that I can fulfill orders without logging into a dashboard.

#### Acceptance Criteria

1. WHEN an Order passes backend validation, THE Email_Service SHALL send a notification email to the Owner_Email.
2. THE Email_Service SHALL send the notification email through a non-AWS backend or serverless API.
3. THE System SHALL read the Owner_Email address and all email credentials from environment variables.
4. THE System SHALL exclude all email credentials and secrets from the frontend code and client-delivered assets.
5. THE Email_Service SHALL set the email subject to "New Sri Crackers Order – [Order_ID] – ₹[Grand_Total]" with the Order_ID and Grand_Total substituted for the current Order.
6. THE Email_Service SHALL format the notification email as HTML that renders readably on mobile email clients.
7. THE Email_Service SHALL include in the email body the heading "NEW ORDER RECEIVED", the Order_ID, the order date and time, the customer details, an order details table with columns S.No, Product, Qty, Unit, Rate, and Amount, the Total Products, the Total Quantity, the Grand_Total, and the Customer Notes.

### Requirement 10: Customer Confirmation

**User Story:** As a customer, I want a clear confirmation after submitting, so that I know my order was received and can reference it later.

#### Acceptance Criteria

1. WHEN an Order is submitted successfully, THE Confirmation_Component SHALL display the message "🎉 Order Submitted Successfully!".
2. WHEN an Order is submitted successfully, THE Confirmation_Component SHALL display the Order_ID for the submitted Order.
3. THE Confirmation_Component SHALL display a reassurance message confirming the business will process the order.
4. THE Confirmation_Component SHALL display a "Continue Shopping" button and a "View Order Summary" button.
5. WHEN the customer activates "Continue Shopping", THE System SHALL navigate to the Catalogue_UI.
6. WHEN the customer activates "View Order Summary", THE System SHALL display the summary of the submitted Order.

### Requirement 11: Order ID Generation

**User Story:** As the business owner, I want a unique reference for every order, so that I can track and discuss orders unambiguously.

#### Acceptance Criteria

1. WHEN an Order is submitted successfully, THE System SHALL generate an Order_ID in the format "SC-2026-NNNNN" where NNNNN is a zero-padded decimal sequence number of exactly 5 digits ranging from "00001" to "99999".
2. THE System SHALL assign each Order_ID such that no Order_ID value is assigned to more than one Order, including across concurrent Order submissions processed simultaneously.
3. WHEN two or more Orders are submitted concurrently, THE System SHALL assign each Order a distinct Order_ID with no collision and no gap-induced reuse, within 2 seconds per Order_ID assignment.
4. IF the Order_ID sequence reaches its maximum value of "99999", THEN THE System SHALL reject further Order_ID assignment, retain the submitted Order data without creating a duplicate Order_ID, and return an error indication that the Order_ID range is exhausted.

### Requirement 12: Product Data Structure

**User Story:** As a developer, I want all product data in a separate structured file, so that the catalogue can be updated for future price lists without changing UI code.

#### Acceptance Criteria

1. THE System SHALL store all 186 products in the Product_Data_File named `products.json`.
2. THE Product_Data_File SHALL define each Product with the fields id, name, category, price, unit, and minimumQuantity.
3. THE Catalogue_UI SHALL consume Product data dynamically from the Product_Data_File at runtime.
4. THE System SHALL exclude hard-coded Product values from the UI components.
5. THE Product_Data_File SHALL contain only Product values sourced from the Price_List_PDF without alteration of any name, category, price, unit, or minimumQuantity.
6. THE Product_Data_File SHALL include all 186 products from the Price_List_PDF with no product omitted.

### Requirement 13: Responsive Design

**User Story:** As a customer on any device, I want the site to adapt to my screen, so that it is usable on phones and remains functional on larger screens.

#### Acceptance Criteria

1. THE System SHALL use the mobile phone layout as the primary design, targeting small screens, one-hand usage, touch input, and slow networks.
2. WHILE the viewport is a mobile width, THE System SHALL render a 2-column product grid, a sticky header, a sticky bottom Cart_Bar, horizontally scrollable category chips, and compact Product_Cards.
3. WHILE the viewport is a mobile width, THE System SHALL render all interactive controls with a touch target of at least 44 pixels by 44 pixels.
4. WHILE the viewport is a desktop width, THE System SHALL render a product grid with three or more columns and a standard cart layout.
5. THE System SHALL derive desktop and tablet layouts as responsive adaptations of the mobile design.

### Requirement 14: Visual Design and Animation

**User Story:** As a customer, I want a premium festive look with smooth motion, so that the experience feels polished and trustworthy.

#### Acceptance Criteria

1. THE System SHALL apply a visual identity using yellow or gold primary accents, deep red festive accents, dark or navy section backgrounds, and white Product_Cards.
2. THE System SHALL render Product_Cards with rounded corners and soft shadows.
3. THE System SHALL render firework-inspired decorative elements in the hero section.
4. WHEN the Cart contents change, THE System SHALL play a cart update animation that completes within 500 milliseconds.
5. WHEN a Catalogue_UI view loads, THE System SHALL apply a fade-in transition that completes within 500 milliseconds.
6. THE System SHALL render animations that maintain a frame rate of at least 30 frames per second on a mid-range mobile device.

### Requirement 15: Product Images Placeholder

**User Story:** As a customer, I want the catalogue to look appealing even without product photos, so that browsing is attractive despite the price list having no images.

#### Acceptance Criteria

1. THE System SHALL exclude invented or externally sourced product photographs from Product_Cards.
2. THE System SHALL display a consistent placeholder visual treatment on every Product_Card in place of a product photograph.
3. THE Catalogue_UI SHALL present an appealing layout without requiring an individual image for each Product.

### Requirement 16: Mobile Bottom Navigation

**User Story:** As a customer on mobile, I want a simple bottom navigation, so that I can move between the main sections with one hand.

#### Acceptance Criteria

1. WHILE the viewport is a mobile width, THE System SHALL display a Bottom_Navigation with entries for Home, Categories, Search, and Cart.
2. WHEN the customer selects a Bottom_Navigation entry, THE System SHALL navigate to the corresponding section.
3. THE Bottom_Navigation SHALL render each entry with a touch target of at least 44 pixels by 44 pixels.

### Requirement 17: Contact Section

**User Story:** As a customer, I want to see and call the business contacts, so that I can reach Sri Crackers directly from my phone.

#### Acceptance Criteria

1. THE System SHALL display a contact section showing the business name "Sri Crackers" and the contact persons "Venkatesh" and "Sri Athesh".
2. THE System SHALL display the phone numbers 8438847168, 9080700123, and 8838525024.
3. WHILE the viewport is a mobile width, THE System SHALL render each displayed phone number as a clickable telephone link.
4. WHEN the customer activates a telephone link on a mobile device, THE System SHALL initiate a phone call to the selected number.

### Requirement 18: Security

**User Story:** As the business owner, I want secrets protected and input controlled, so that the site cannot leak credentials or accept malicious data.

#### Acceptance Criteria

1. THE System SHALL store email credentials, API keys, and backend secrets in environment variables.
2. THE System SHALL exclude email credentials, API keys, and backend secrets from the frontend code and client-delivered assets.
3. WHEN an Order submission reaches the backend, THE Order_Validator SHALL validate all submitted order data on the backend.
4. WHEN an Order submission reaches the backend, THE System SHALL sanitize all customer-provided input before further processing.
5. WHILE an Order submission is being processed, THE System SHALL prevent a duplicate submission of the same Order.

### Requirement 19: Performance

**User Story:** As a customer on a slow mobile network, I want the site to load and respond fast, so that I can shop without delays.

#### Acceptance Criteria

1. THE System SHALL render the initial above-the-fold home page content within 3 seconds on a 3G mobile network profile.
2. THE System SHALL defer loading of below-the-fold Catalogue content until it is needed, using lazy loading.
3. WHERE images are used, THE System SHALL serve responsive image sizes appropriate to the viewport width.
4. THE System SHALL produce an SEO-friendly document structure with semantic HTML and descriptive metadata.
5. THE System SHALL minimize client-side JavaScript delivered for the initial page load.

### Requirement 20: End-to-End User Journey

**User Story:** As a customer, I want the whole process to feel like a simple mobile shopping app, so that I can order from opening the site to confirmation without friction.

#### Acceptance Criteria

1. WHEN the customer selects product quantities, THE System SHALL update the Cart_Bar Grand_Total to reflect the current Cart contents.
2. WHEN the customer proceeds from the Cart_Page, THE System SHALL present the Checkout_Component for contact and delivery details.
3. WHEN the customer submits valid details, THE System SHALL process the Order on the backend, send the owner notification email, and display the Confirmation_Component with the Order_ID.
4. IF backend processing of a valid submission fails, THEN THE System SHALL display an error message and re-enable the "SUBMIT ORDER" button.

## Constraints

- **No AWS**: THE System SHALL NOT use any Amazon Web Services component, including SES, Lambda, and S3, for any part of the solution. (Negative statement retained because the constraint is an absolute prohibition.)
- **Source of Truth**: THE System SHALL derive all Product names, categories, prices, units, and minimum quantities exclusively from the Price_List_PDF, with all 186 products included and none omitted or altered.
