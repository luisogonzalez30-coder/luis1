# ClickBank API — Modelos de datos y enumeraciones (v1.3)

Extraído del esquema OpenAPI. Los enums son la fuente de verdad para los valores válidos de los parámetros.

## Enumeraciones

| Enum | Valores permitidos |
|---|---|
| `ActiveStatus` | `ACTIVE`, `INACTIVE` |
| `AnalyticAttribute` | `DIMENSION_VALUE`, `HOP_COUNT`, `ORDER_IMPRESSION`, `INITIAL_ORDER_IMPRESSION`, `UPSELL_ORDER_IMPRESSION`, `ORDER_SUBMISSION`, `SALE_COUNT`, `SALE_AMOUNT`, `REFUND_COUNT`, `REFUND_AMOUNT`, `CHARGEBACK_COUNT`, `CHARGEBACK_AMOUNT`, `REBILL_COUNT`, `REBILL_AMOUNT`, `UPSELL_COUNT`, `UPSELL_AMOUNT`, `TOTAL_ORDER_IMPRESSION`, `GROSS_SALE_COUNT`, `GROSS_SALE_AMOUNT`, `NET_SALE_COUNT`, `NET_SALE_AMOUNT`, `EARNINGS_PER_HOP`, `EARNINGS_PER_CLICK`, `HOPS_PER_SALE`, `HOPS_PER_ORDER_FORM_IMPRESSION`, `ORDER_FORM_SALE_CONVERSION`, `REFUND_RATE`, `CHARGEBACK_RATE` |
| `ContractStatus` | `nil`, `PENDING_START`, `PENDING_APPROVAL`, `ACTIVE`, `TERMINATED`, `TERMINATION_REQUESTED`, `EXPIRED` |
| `Currency` | `ARS`, `AUD`, `CAD`, `CHF`, `CLP`, `CNY`, `COP`, `CZK`, `DKK`, `EUR`, `GBP`, `HKD`, `HUF`, `IDR`, `INR`, `JPY`, `KRW`, `MXN`, `MYR`, `NOK`, `NZD`, `PHP`, `PLN`, `RUB`, `SEK`, `SGD`, `THB`, `TRY`, `USD`, `ZAR` |
| `Dimension` | `AFFILIATE`, `CUSTOMER_CURRENCY`, `CUSTOMER_COUNTRY`, `CUSTOMER_PROVINCE`, `CUSTOMER_LANGUAGE`, `PRODUCT_SKU`, `TRACKING_ID`, `VENDOR`, `VENDOR_CATEGORY`, `VENDOR_PRODUCT_SKU` |
| `DimensionColumn` | `CHARGEBACK_AMOUNT`, `CHARGEBACK_COUNT`, `CHARGEBACK_RATE`, `DIMENSION_VALUE`, `EARNINGS_PER_HOP`, `GROSS_SALE_COUNT`, `GROSS_SALE_AMOUNT`, `HOP_COUNT`, `HOPS_PER_SALE`, `HOPS_PER_ORDER_FORM_IMPRESSION`, `NET_SALE_AMOUNT`, `NET_SALE_COUNT`, `ORDER_FORM_SALE_CONVERSION`, `ORDER_IMPRESSION`, `ORDER_SUBMISSION`, `REBILL_AMOUNT`, `REBILL_COUNT`, `REFUND_AMOUNT`, `REFUND_COUNT`, `REFUND_RATE`, `SALE_AMOUNT`, `SALE_COUNT`, `UPSELL_AMOUNT`, `UPSELL_COUNT` |
| `ImageType` | `nil`, `PRODUCT`, `BANNER`, `BANNER_CLASSIC`, `BANNER_NEW`, `BANNER_BG`, `CUSTOM_BANNER`, `CUSTOM_BANNER_BG`, `CUSTOM_ORDERFORM` |
| `Language` | `DE`, `EN`, `ES`, `FR`, `IT`, `PT` |
| `ProductCategory` | `nil`, `EBOOK`, `SOFTWARE`, `GAMES`, `AUDIO`, `VIDEO`, `MEMBER_SITE` |
| `ProductType` | `nil`, `STANDARD`, `RECURRING` |
| `RecurringFrequency` | `nil`, `WEEKLY`, `BI_WEEKLY`, `MONTHLY`, `QUARTERLY`, `HALF_YEARLY`, `YEARLY`, `MONTHS`, `WEEKS`, `DAYS` |
| `RefundType` | `nil`, `FULL`, `PARTIAL_PERCENT`, `PARTIAL_AMOUNT`, `PARTIAL_QUANTITY`, `TAX` |
| `RevRec` | `nil`, `LD`, `VD`, `LM`, `LMA`, `LMID`, `VM`, `I` |
| `Role` | `nil`, `VENDOR`, `CUSTOMER`, `CBCSR`, `CBSYSTEM`, `USER` |
| `RoleAccount` | `nil`, `VENDOR`, `AFFILIATE` |
| `ShippingStatus` | `nil`, `shipped`, `notshipped`, `all` |
| `SortDirection` | `ASC`, `DESC` |
| `SubscriptionDetailRowOrderBy` | `RECEIPT`, `PURCHASE_DATE`, `SUB_END_DATE`, `SUB_CANCEL_DATE`, `NEXT_PAYMENT_DATE`, `SUB_VALUE`, `STATUS`, `ITEM_NUMBER`, `PROCESSED_PAYMENTS_COUNT`, `FUTURE_PAYMENTS_COUNT`, `REFUND_COUNT`, `REFUND_AMOUNT`, `CHARGEBACK_COUNT`, `CHARGEBACK_AMOUNT`, `PUB_NICK_NAME`, `AFFILIATE_NICK_NAME`, `CUSTOMER_FIRST_NAME`, `CUSTOMER_LAST_NAME`, `CUSTOMER_DISPLAY_NAME`, `CUSTOMER_EMAIL`, `DURATION`, `INITIAL_SALE_AMOUNT`, `INITIAL_SALE_COUNT`, `REBILL_SALE_AMOUNT`, `REBILL_SALE_COUNT` |
| `SubscriptionStatus` | `nil`, `ACTIVE`, `COMPLETED`, `CANCELED`, `RETRY_PAYMENT`, `REQUEST_NEW_CARD` |
| `SummaryType` | `VENDOR_ONLY`, `AFFILIATE_ONLY` |
| `TicketAction` | `nil`, `change`, `close`, `reopen` |
| `TicketActionType` | `nil`, `ASSIGNED`, `COMMENTED`, `CHANGED`, `CLOSED`, `EXPIRED`, `REOPENED`, `OPENED`, `APPROVED`, `DISAPPROVED`, `ATTACHMENT`, `ADMIN_CHANGE`, `REFUND_ACKED`, `NEW_PHOTO_ID` |
| `TicketReasonRequest` | `ticket.type.cancel.1`, `ticket.type.cancel.2`, `ticket.type.cancel.3`, `ticket.type.cancel.4`, `ticket.type.cancel.5`, `ticket.type.cancel.6`, `ticket.type.cancel.7`, `ticket.type.cancel.not.mobile`, `ticket.type.refund.1`, `ticket.type.refund.2`, `ticket.type.refund.3`, `ticket.type.refund.4`, `ticket.type.refund.5`, `ticket.type.refund.6`, `ticket.type.refund.7`, `ticket.type.refund.8`, `ticket.type.refund.returned`, `ticket.type.refund.not.mobile`, `ticket.type.tech_support.1`, `ticket.type.tech_support.2`, `ticket.type.tech_support.3`, `ticket.type.tech_support.4`, `ticket.type.tech_support.9`, `ticket.type.tech_support.10` |
| `TicketSource` | `nil`, `API`, `CUSTOMER_WAM`, `UNKNOWN`, `RNFDS_EMAIL`, `CNCLS_EMAIL`, `VENDOR_WAM`, `VENDOR_ADMIN`, `CSR_ADMIN`, `SECURITY`, `CSR_WAM`, `CONVERSION_PROCESS`, `BUSINESS_DEVELOPMENT_FORM`, `COMMUNICATIONS_EMAIL`, `ACCOUNTS_EMAIL`, `CBCS_EMAIL`, `ACCOUNTING_EMAIL`, `WAM_ACCT_QUESTION`, `WAM_WIREGROUP_DETAIL`, `MARKETING_EMAIL`, `PAYMENTECH_BATCH`, `PYPL_JPY_CANCELLER`, `ECUSTOMS`, `LASHBACK`, `SPAM_EMAIL`, `CLICKBANK_DATABASE_SCRIPT`, `API_VIRTUAL_SOURCE`, `KOUNT`, `PAYPAL_ADAPTIVE`, `CB_POWERED_PROGRAM`, `CLKBANK` |
| `TicketStatus` | `nil`, `OPEN`, `REOPENED`, `CLOSED` |
| `TicketType` | `nil`, `TECH_SUPPORT`, `REFUND`, `CANCEL`, `PRODUCT_CHANGE`, `ORDER_LOOKUP`, `ESCALATED`, `APPROVAL_IMAGE`, `APPROVAL_UPSELL`, `APPROVAL_CATEGORY_CHANGE`, `APPROVAL_BLOG_POST`, `APPROVAL_PRODUCT`, `APPROVAL_ADVANCED_UPSELL`, `APPROVAL_CSS_ORDERFORM`, `APPROVAL_TEMPLATE_ORDERFORM`, `APPROVAL_TEMPLATE_EXITOFFER`, `APPROVAL_ORDER_BUMP_CUSTOM_TEXT`, `APPROVAL_EXIT_OFFER`, `APPROVAL_PHOTO_ID`, `ACCT_QUESTION_ACCOUNTS`, `ACCT_QUESTION_ACCOUNTING`, `SPAM`, `ACCOUNT_ABUSE`, `SECURITY_CONCERN` |
| `TicketTypeRequest` | `rfnd`, `cncl`, `tech` |
| `TransactionType` | `nil`, `SALE`, `RFND`, `CGBK`, `FEE`, `BILL`, `TEST_SALE`, `TEST_BILL`, `TEST_RFND`, `TEST_FEE` |

## Objetos

### `AccountData`

| Campo | Tipo | Req. | Descripción |
|---|---|---|---|
| `nickName` | string | no |  |
| `quickStats` | array<`QuickStatsData`> | no |  |

### `AccountList`

| Campo | Tipo | Req. | Descripción |
|---|---|---|---|
| `accountData` | array<`AccountData`> | no |  |

### `AnalyticStatus`

| Campo | Tipo | Req. | Descripción |
|---|---|---|---|
| `status` | string | no |  |
| `lastUpdateTime` | string(date-time) | no | The date is in ISO 8601 date format yyyy-mm-ddThh:mm:ssZ. |

### `AnalyticsResult`

| Campo | Tipo | Req. | Descripción |
|---|---|---|---|
| `rows` | `Rows` | no |  |
| `totals` | `Totals` | no |  |

### `AnalyticsResultRow`

| Campo | Tipo | Req. | Descripción |
|---|---|---|---|
| `dimensionIdentifier` | string | no |  |
| `dimensionValue` | string | no |  |
| `accountNickName` | string | no |  |
| `data` | array<`AnalyticsValue`> | no |  |

### `AnalyticsValue`

| Campo | Tipo | Req. | Descripción |
|---|---|---|---|
| `attribute` | `AnalyticAttribute` enum | no |  |
| `value` | `AnalyticsValueDetail` | no |  |

### `AnalyticsValueDetail`

| Campo | Tipo | Req. | Descripción |
|---|---|---|---|
| `@type` | string | no |  |
| `$` | string | no | The property name is actually `$` but this causes issues for code generators and is disabled for now. |

### `ContactField`

| Campo | Tipo | Req. | Descripción |
|---|---|---|---|
| `field` | string | no |  |
| `value` | string | no |  |

### `ContractBean`

| Campo | Tipo | Req. | Descripción |
|---|---|---|---|
| `contacts` | array<`ContractContact`> | no |  |
| `id` | integer(int32) | no |  |
| `status` | `ContractStatus` enum | no |  |

### `ContractContact`

| Campo | Tipo | Req. | Descripción |
|---|---|---|---|
| `productId` | integer(int32) | no |  |
| `name` | string | no |  |
| `owner` | string | no |  |
| `partner` | string | no |  |

### `ImageBean`

| Campo | Tipo | Req. | Descripción |
|---|---|---|---|
| `id` | integer(int32) | no |  |
| `title` | string | no |  |
| `type` | `ImageType` enum | no |  |
| `approved` | boolean | no |  |
| `path` | string | no |  |

### `ImageData`

| Campo | Tipo | Req. | Descripción |
|---|---|---|---|
| `id` | integer(int32) | no |  |
| `title` | string | no |  |
| `type` | `ImageType` enum | no |  |
| `approved` | boolean | no |  |

### `ImageList`

| Campo | Tipo | Req. | Descripción |
|---|---|---|---|
| `images` | array<`ImageData`> | no |  |

### `ImageListResult`

| Campo | Tipo | Req. | Descripción |
|---|---|---|---|
| `imageList` | `ImageList` | no |  |
| `total_record_count` | integer(int32) | no |  |

### `LineItemData`

| Campo | Tipo | Req. | Descripción |
|---|---|---|---|
| `itemNo` | string | no |  |
| `productTitle` | string | no |  |
| `recurring` | boolean | no |  |
| `shippable` | boolean | no |  |
| `customerAmount` | number(double) | no |  |
| `accountAmount` | number(double) | no |  |
| `quantity` | integer(int32) | no |  |
| `lineItemType` | string | no |  |
| `rebillAmount` | number(double) | no |  |
| `processedPayments` | integer(int32) | no |  |
| `futurePayments` | integer(int32) | no |  |
| `nextPaymentDate` | string(date-time) | no | The date is in ISO 8601 date format yyyy-mm-ddThh:mm:ssZ. |
| `status` | string | no |  |
| `role` | string | no |  |

### `OrderData`

| Campo | Tipo | Req. | Descripción |
|---|---|---|---|
| `transactionTime` | string(date-time) | no | The date is in ISO 8601 date format yyyy-mm-ddThh:mm:ssZ. |
| `receipt` | string | no |  |
| `trackingId` | string | no |  |
| `paytmentMethod` | string | no |  |
| `transactionType` | string | no |  |
| `totalOrderAmount` | number(double) | no |  |
| `totalShippingAmount` | number(double) | no |  |
| `totalTaxAmount` | number(double) | no |  |
| `vendor` | string | no |  |
| `affiliate` | string | no |  |
| `country` | string | no |  |
| `state` | string | no |  |
| `lastName` | string | no |  |
| `firstName` | string | no |  |
| `currency` | string | no |  |
| `declinedConsent` | boolean | no |  |
| `email` | string | no |  |
| `postalCode` | string | no |  |
| `customerContactInfo` | array<`ContactField`> | no |  |
| `role` | string | no |  |
| `fullName` | string | no |  |
| `customerRefundableState` | string | no |  |
| `vendorVariables` | `VendorVariableElementArray` | no |  |
| `lineItemData` | array<`LineItemData`> | no |  |

### `OrderList`

| Campo | Tipo | Req. | Descripción |
|---|---|---|---|
| `orderData` | array<`OrderData`> | no |  |

### `OrderShipData`

| Campo | Tipo | Req. | Descripción |
|---|---|---|---|
| `receipt` | string | no |  |
| `firstName` | string | no |  |
| `lastName` | string | no |  |
| `email` | string | no |  |
| `phoneNumber` | string | no |  |
| `address1` | string | no |  |
| `address2` | string | no |  |
| `city` | string | no |  |
| `state` | string | no |  |
| `country` | string | no |  |
| `postalCode` | string | no |  |
| `transactionTime` | string(date-time) | no | The date is in ISO 8601 date format yyyy-mm-ddThh:mm:ssZ. |
| `isTestTransaction` | boolean | no |  |
| `fullName` | string | no |  |
| `vendor` | string | no |  |
| `vendorVariables` | `VendorVariableElementArray` | no |  |
| `lineItemShipData` | array<`OrderShipLineItemData`> | no |  |

### `OrderShipLineItemData`

| Campo | Tipo | Req. | Descripción |
|---|---|---|---|
| `itemNo` | string | no |  |
| `productTitle` | string | no |  |
| `customerAmount` | number(double) | no |  |
| `accountAmount` | number(double) | no |  |
| `quantity` | integer(int32) | no |  |
| `shippingMethod` | string | no |  |
| `isRefundPending` | boolean | no |  |
| `hasBeenRefunded` | boolean | no |  |
| `hasBeenChargebacked` | boolean | no |  |

### `PartialRefundData`

| Campo | Tipo | Req. | Descripción |
|---|---|---|---|
| `usdAmount` | number(double) | no |  |
| `customerAmount` | number(double) | no |  |
| `customerCurrency` | string | no |  |
| `productAmount` | number(double) | no |  |
| `productCurrency` | string | no |  |

### `PhysicalPricing`

| Campo | Tipo | Req. | Descripción |
|---|---|---|---|
| `shipping_profile` | string | no |  |

### `PitchPages`

| Campo | Tipo | Req. | Descripción |
|---|---|---|---|
| `desktop` | string | no |  |
| `mobile` | string | no |  |

### `Price`

| Campo | Tipo | Req. | Descripción |
|---|---|---|---|
| `native_price` | number(double) | no |  |
| `usd` | number(double) | no |  |
| `usd_with_fees` | number(double) | no |  |

### `Pricing`

| Campo | Tipo | Req. | Descripción |
|---|---|---|---|
| `@currency` | `Currency` enum | no |  |
| `standard` | `StandardPricing` | no |  |
| `physical` | `PhysicalPricing` | no |  |
| `recurring` | `RecurringPricing` | no |  |

### `Pricings`

| Campo | Tipo | Req. | Descripción |
|---|---|---|---|
| `pricing` | `Pricing` | no |  |

### `Product`

| Campo | Tipo | Req. | Descripción |
|---|---|---|---|
| `@sku` | string | no |  |
| `id` | integer(int32) | no |  |
| `status` | `ActiveStatus` enum | no |  |
| `digital` | boolean | no |  |
| `physical` | boolean | no |  |
| `digitalRecurring` | boolean | no |  |
| `physicalRecurring` | boolean | no |  |
| `site` | string | no |  |
| `created` | string | no |  |
| `updated` | string | no |  |
| `approval_status` | `ProductApprovalStatus` | no |  |
| `language` | `Language` enum | no |  |
| `title` | string | no |  |
| `description` | string | no |  |
| `post_purchase_description` | string | no |  |
| `image` | `ImageBean` | no |  |
| `thank_you_pages` | `ThankYouPages` | no |  |
| `pitch_pages` | `PitchPages` | no |  |
| `commission` | `ProductCommission` | no |  |
| `pricings` | array<`Pricings`> | no |  |
| `contracts` | array<`ContractBean`> | no |  |
| `categories` | array<`ProductCategoryItem`> | no |  |
| `disable_geo_currency` | boolean | no |  |
| `allow_currency_change` | boolean | no |  |
| `us_tax_exempt` | boolean | no |  |
| `revenue_recognition` | `RevRec` enum | no |  |
| `reduced_upsell_markup` | boolean | no |  |
| `skip_confirmation_page` | boolean | no |  |
| `admin_download_url` | string | no |  |
| `admin_mobile_download_url` | string | no |  |
| `no_commission` | boolean | no |  |
| `sale_refund_days_limit` | integer(int32) | no |  |
| `rebill_refund_days_limit` | integer(int32) | no |  |
| `admin_restrict_flexible_refund` | boolean | no |  |
| `commission_tier_override` | boolean | no |  |
| `deliveryMethod` | string | no |  |
| `deliverySpeed` | string | no |  |
| `isPartOfOrderBump` | integer(int32) | no |  |
| `isInitialOfOrderBump` | boolean | no |  |
| `isProductOfOrderBump` | boolean | no |  |
| `phoneNumberOnOrderForm` | boolean | no |  |
| `delayedDelivery` | boolean | no |  |
| `sendRebillNotification` | boolean | no |  |

### `ProductApprovalStatus`

| Campo | Tipo | Req. | Descripción |
|---|---|---|---|
| `ticket_id` | integer(int32) | no |  |
| `status` | string | no |  |
| `last_action_performed_by` | `Role` enum | no |  |

### `ProductCategoryItem`

| Campo | Tipo | Req. | Descripción |
|---|---|---|---|
| `category` | `ProductCategory` enum | no |  |

### `ProductCommission`

| Campo | Tipo | Req. | Descripción |
|---|---|---|---|
| `purchase` | number(double) | no |  |
| `rebill` | number(double) | no |  |
| `no_rebill_commission` | boolean | no |  |
| `commission_tier_override` | boolean | no |  |

### `ProductList`

| Campo | Tipo | Req. | Descripción |
|---|---|---|---|
| `products` | `Products` | no |  |
| `total_record_count` | integer(int32) | no |  |

### `Products`

| Campo | Tipo | Req. | Descripción |
|---|---|---|---|
| `product` | array<`Product`> | no |  |

### `QuickStatsData`

| Campo | Tipo | Req. | Descripción |
|---|---|---|---|
| `quickStatDate` | string(date-time) | no | The date is in ISO 8601 date format yyyy-mm-ddThh:mm:ssZ. |
| `sale` | number(double) | no |  |
| `refund` | number(double) | no |  |
| `chargeback` | number(double) | no |  |

### `RecurringPricing`

| Campo | Tipo | Req. | Descripción |
|---|---|---|---|
| `price` | `Price` | no |  |
| `frequency` | `RecurringFrequency` enum | no |  |
| `duration` | integer(int32) | no |  |
| `trial_days` | integer(int32) | no |  |
| `pre_rebill_override` | boolean | no |  |
| `pre_rebill_leadtime` | integer(int32) | no |  |
| `recurringTitle` | string | no |  |
| `recurringDescription` | string | no |  |
| `frequencyValue` | integer(int32) | no |  |

### `Rows`

| Campo | Tipo | Req. | Descripción |
|---|---|---|---|
| `row` | array<`AnalyticsResultRow`> | no |  |

### `ShippingList`

| Campo | Tipo | Req. | Descripción |
|---|---|---|---|
| `orderShipData2` | array<`OrderShipData`> | no |  |

### `ShippingNoticeData`

| Campo | Tipo | Req. | Descripción |
|---|---|---|---|
| `shipDate` | string(date-time) | no | The date is in ISO 8601 date format yyyy-mm-ddThh:mm:ssZ. |
| `carrier` | string | no |  |
| `trackingId` | string | no |  |
| `shippedTo` | string | no |  |
| `comments` | string | no |  |
| `receipt` | string | no |  |
| `itemNo` | string | no |  |

### `ShippingNoticeList`

| Campo | Tipo | Req. | Descripción |
|---|---|---|---|
| `shippingNoticeData` | array<`ShippingNoticeData`> | no |  |

### `StandardPricing`

| Campo | Tipo | Req. | Descripción |
|---|---|---|---|
| `price` | `Price` | no |  |

### `SubscriptionDetailResult`

| Campo | Tipo | Req. | Descripción |
|---|---|---|---|
| `totalCount` | integer(int32) | no |  |
| `data` | `SubscriptionDetailsDataWrapper` | no |  |

### `SubscriptionDetailsDataWrapper`

| Campo | Tipo | Req. | Descripción |
|---|---|---|---|
| `row` | array<`SubscriptionDetailsRowData`> | no |  |

### `SubscriptionDetailsRowData`

| Campo | Tipo | Req. | Descripción |
|---|---|---|---|
| `affNickName` | string | no |  |
| `cancelled` | boolean | no |  |
| `chargebackAmount` | number(double) | no |  |
| `chargebackCount` | integer(int32) | no |  |
| `countryCode` | string | no |  |
| `currencyCode` | `Currency` enum | no |  |
| `customerDisplayName` | string | no |  |
| `customerFirstName` | string | no |  |
| `customerLastName` | string | no |  |
| `duration` | integer(int32) | no |  |
| `email` | string | no |  |
| `frequency` | string | no |  |
| `ftxnId` | integer(int32) | no |  |
| `futurePaymentsCount` | integer(int32) | no |  |
| `initialSaleAmount` | number(double) | no |  |
| `initialSaleCount` | integer(int32) | no |  |
| `itemNo` | string | no |  |
| `nextPaymentDate` | string(date-time) | no | The date is in ISO 8601 date format yyyy-mm-ddThh:mm:ssZ. |
| `paymentMethod` | string | no |  |
| `processedPaymentsCount` | integer(int32) | no |  |
| `province` | string | no |  |
| `pubNickName` | string | no |  |
| `purchaseDate` | string(date-time) | no | The date is in ISO 8601 date format yyyy-mm-ddThh:mm:ssZ. |
| `rebillSaleAmount` | number(double) | no |  |
| `rebillSaleCount` | integer(int32) | no |  |
| `receipt` | string | no |  |
| `refundAmount` | number(double) | no |  |
| `refundCount` | integer(int32) | no |  |
| `status` | string | no |  |
| `subCancelDate` | string(date-time) | no | The date is in ISO 8601 date format yyyy-mm-ddThh:mm:ssZ. |
| `subEndDate` | string(date-time) | no | The date is in ISO 8601 date format yyyy-mm-ddThh:mm:ssZ. |
| `subValue` | number(double) | no |  |
| `timeStr` | string | no |  |
| `trialPeriod` | string | no |  |
| `txnType` | string | no |  |

### `SubscriptionProductRowData`

| Campo | Tipo | Req. | Descripción |
|---|---|---|---|
| `avgActiveSubCnt` | number(double) | no |  |
| `avgSubAge` | number(double) | no |  |
| `avgSubValue` | number(double) | no |  |
| `businessDate` | string(date) | no |  |
| `cancelSubCnt` | number(double) | no |  |
| `description` | string | no |  |
| `duration` | integer(int32) | no |  |
| `frequency` | string | no |  |
| `grossSales` | number(double) | no |  |
| `initialSaleAmt` | number(double) | no |  |
| `initialSaleCnt` | number(double) | no |  |
| `itemNo` | string | no |  |
| `netSales` | number(double) | no |  |
| `nickname` | string | no |  |
| `productId` | integer(int32) | no |  |
| `recurringSaleAmt` | number(double) | no |  |
| `recurringSaleCnt` | number(double) | no |  |
| `title` | string | no |  |
| `totalSalesCnt` | number(double) | no |  |
| `trialPeriod` | string | no |  |

### `SubscriptionTrendsData`

| Campo | Tipo | Req. | Descripción |
|---|---|---|---|
| `totalCount` | integer(int32) | no |  |
| `data` | `SubscriptionTrendsDataWrapper` | no |  |

### `SubscriptionTrendsDataWrapper`

| Campo | Tipo | Req. | Descripción |
|---|---|---|---|
| `row` | array<`SubscriptionProductRowData`> | no |  |

### `ThankYouPages`

| Campo | Tipo | Req. | Descripción |
|---|---|---|---|
| `desktop` | string | no |  |
| `mobile` | string | no |  |

### `TicketCommentData`

| Campo | Tipo | Req. | Descripción |
|---|---|---|---|
| `commentId` | integer(int32) | no |  |
| `date` | string(date-time) | no | The date is in ISO 8601 date format yyyy-mm-ddThh:mm:ssZ. |
| `comment` | string | no |  |
| `action` | `TicketActionType` enum | no |  |
| `commentRole` | `Role` enum | no |  |

### `TicketData`

| Campo | Tipo | Req. | Descripción |
|---|---|---|---|
| `ticketId` | integer(int32) | no |  |
| `receipt` | string | no |  |
| `status` | `TicketStatus` enum | no |  |
| `type` | `TicketType` enum | no |  |
| `comments` | array<`TicketCommentData`> | no |  |
| `openedDate` | string(date-time) | no | The date is in ISO 8601 date format yyyy-mm-ddThh:mm:ssZ. |
| `closedDate` | string(date-time) | no | The date is in ISO 8601 date format yyyy-mm-ddThh:mm:ssZ. |
| `description` | string | no |  |
| `refundType` | `RefundType` enum | no |  |
| `refundAmount` | number(double) | no |  |
| `customerFirstName` | string | no |  |
| `customerLastName` | string | no |  |
| `email` | string | no |  |
| `emailAtOrderTime` | string | no |  |
| `expirationDate` | string(date-time) | no | The date is in ISO 8601 date format yyyy-mm-ddThh:mm:ssZ. |
| `locale` | string | no |  |
| `note` | string | no |  |
| `productItemNo` | string | no |  |
| `updateTime` | string(date-time) | no | The date is in ISO 8601 date format yyyy-mm-ddThh:mm:ssZ. |
| `source` | `TicketSource` enum | no |  |

### `TicketList`

| Campo | Tipo | Req. | Descripción |
|---|---|---|---|
| `ticketData` | array<`TicketData`> | no |  |

### `Totals`

| Campo | Tipo | Req. | Descripción |
|---|---|---|---|
| `total` | array<`AnalyticsValue`> | no |  |

### `VendorVariableElement`

| Campo | Tipo | Req. | Descripción |
|---|---|---|---|
| `name` | string | no |  |
| `value` | string | no |  |

### `VendorVariableElementArray`

| Campo | Tipo | Req. | Descripción |
|---|---|---|---|
| `item` | array<`VendorVariableElement`> | no |  |
