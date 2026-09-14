# ClickBank API — Catálogo completo de endpoints (v1.3)

Base URL: `https://api.clickbank.com`  ·  Spec: OpenAPI 3.0.1, versión `1.3`

Todas las rutas cuelgan de `https://api.clickbank.com`. Los parámetros van **siempre en query string**; los `post`/`put` con cuerpo usan `application/json` o `application/xml`.

## Índice

| Grupo | Endpoints |
|---|---|
| [Analytics](#analytics) | 13 |
| [Debug](#debug) | 1 |
| [Images](#images) | 1 |
| [Orders](#orders) | 10 |
| [Orders2](#orders2) | 11 |
| [Products](#products) | 4 |
| [Quickstats](#quickstats) | 3 |
| [Shipping](#shipping) | 4 |
| [Shipping2](#shipping2) | 4 |
| [Shipping3](#shipping3) | 4 |
| [Tickets](#tickets) | 7 |


## Analytics

The Analytics API provides account and subscription analytics information  
Doc oficial: https://api.clickbank.com/rest/1.3/analytics

| Método | Ruta | Qué hace |
|---|---|---|
| `GET` | `/rest/1.3/analytics/status` | Return the status & last update time of the API. |
| `GET` | `/rest/1.3/analytics/{role}/subscription/details/compthirty` | Returns a list of subscriptions completing in the next 30 days. |
| `GET` | `/rest/1.3/analytics/{role}/subscription/details/compsixty` | Returns a list of subscriptions completing in the next 60 days. |
| `GET` | `/rest/1.3/analytics/{role}/subscription/details/cancelthirty` | Returns a list of subscriptions canceled in the last 30 days. |
| `GET` | `/rest/1.3/analytics/{role}/subscription/details/cancelsixty` | Returns a list of subscriptions canceled in the last 60 days. |
| `GET` | `/rest/1.3/analytics/{role}/subscription/details/startdate` | Returns a list of subscriptions where the subscription start date is between (inclusive) the startDate and end |
| `GET` | `/rest/1.3/analytics/{role}/subscription/details/canceldate` | Returns a list of subscriptions where the subscription canceled date is between (inclusive) the startDate and  |
| `GET` | `/rest/1.3/analytics/{role}/subscription/details/nextpmtdate` | Returns a list of subscriptions where the next payment date is between (inclusive) the startDate and endDate p |
| `GET` | `/rest/1.3/analytics/{role}/subscription/details/status` |  |
| `GET` | `/rest/1.3/analytics/{role}/subscription/details` | Returns a list of subscriptions details. |
| `GET` | `/rest/1.3/analytics/{role}/subscription/trends` | Returns statistical summations of data for subscriptions. |
| `GET` | `/rest/1.3/analytics/{role}/{dimension}` | Returns statistical data for a given role and dimension. |
| `GET` | `/rest/1.3/analytics/{role}/{dimension}/summary` | Returns summary statistical data for a given role, dimension, and summary type. |


### `GET /rest/1.3/analytics/status`

Return the status & last update time of the API.

**Permisos:** api_analytics_client • HAS_DEVELOPER_KEY

`operationId`: `GetStatus`

**Respuestas:** `200` OK → `AnalyticStatus` · `403` Forbidden → string


### `GET /rest/1.3/analytics/{role}/subscription/details/compthirty`

Returns a list of subscriptions completing in the next 30 days.

**Permisos:** api_analytics_client • HAS_DEVELOPER_KEY

`operationId`: `GetSubscriptionDetailsCompletingIn30Days`

| Parámetro | En | Req. | Tipo | Descripción |
|---|---|---|---|---|
| `role` | path | sí | `RoleAccount`: `nil`, `VENDOR`, `AFFILIATE` | A valid role |
| `account` | query | sí | string | The account nickname/site. |
| `orderBy` | query | no | `SubscriptionDetailRowOrderBy`: `RECEIPT`, `PURCHASE_DATE`, `SUB_END_DATE`, `SUB_CANCEL_DATE`, `NEXT_PAYMENT_DATE`, `SUB_VALUE`, `STATUS`, `ITEM_NUMBER`, `PROCESSED_PAYMENTS_COUNT`, `FUTURE_PAYMENTS_COUNT`, `REFUND_COUNT`, `REFUND_AMOUNT`, `CHARGEBACK_COUNT`, `CHARGEBACK_AMOUNT`, `PUB_NICK_NAME`, `AFFILIATE_NICK_NAME`, `CUSTOMER_FIRST_NAME`, `CUSTOMER_LAST_NAME`, `CUSTOMER_DISPLAY_NAME`, `CUSTOMER_EMAIL`, `DURATION`, `INITIAL_SALE_AMOUNT`, `INITIAL_SALE_COUNT`, `REBILL_SALE_AMOUNT`, `REBILL_SALE_COUNT` | Customer details are only available to vendors. |
| `sortDirection` | query | no | `SortDirection`: `ASC`, `DESC` | The order in which the sorted results are returned |

**Respuestas:** `200` OK → `SubscriptionDetailResult` · `403` Forbidden → string


### `GET /rest/1.3/analytics/{role}/subscription/details/compsixty`

Returns a list of subscriptions completing in the next 60 days.

**Permisos:** api_analytics_client • HAS_DEVELOPER_KEY

`operationId`: `GetSubscriptionDetailsCompletingIn60Days`

| Parámetro | En | Req. | Tipo | Descripción |
|---|---|---|---|---|
| `role` | path | sí | `RoleAccount`: `nil`, `VENDOR`, `AFFILIATE` | A valid role |
| `account` | query | sí | string | The account nickname/site. |
| `orderBy` | query | no | `SubscriptionDetailRowOrderBy`: `RECEIPT`, `PURCHASE_DATE`, `SUB_END_DATE`, `SUB_CANCEL_DATE`, `NEXT_PAYMENT_DATE`, `SUB_VALUE`, `STATUS`, `ITEM_NUMBER`, `PROCESSED_PAYMENTS_COUNT`, `FUTURE_PAYMENTS_COUNT`, `REFUND_COUNT`, `REFUND_AMOUNT`, `CHARGEBACK_COUNT`, `CHARGEBACK_AMOUNT`, `PUB_NICK_NAME`, `AFFILIATE_NICK_NAME`, `CUSTOMER_FIRST_NAME`, `CUSTOMER_LAST_NAME`, `CUSTOMER_DISPLAY_NAME`, `CUSTOMER_EMAIL`, `DURATION`, `INITIAL_SALE_AMOUNT`, `INITIAL_SALE_COUNT`, `REBILL_SALE_AMOUNT`, `REBILL_SALE_COUNT` | Customer details are only available to vendors. |
| `sortDirection` | query | no | `SortDirection`: `ASC`, `DESC` | The order in which the sorted results are returned |

**Respuestas:** `200` OK → `SubscriptionDetailResult` · `403` Forbidden → string


### `GET /rest/1.3/analytics/{role}/subscription/details/cancelthirty`

Returns a list of subscriptions canceled in the last 30 days.

**Permisos:** api_analytics_client • HAS_DEVELOPER_KEY

`operationId`: `GetSubscriptionDetailsCanceledLast30Days`

| Parámetro | En | Req. | Tipo | Descripción |
|---|---|---|---|---|
| `role` | path | sí | `RoleAccount`: `nil`, `VENDOR`, `AFFILIATE` | A valid role |
| `account` | query | sí | string | The account nickname/site. |
| `orderBy` | query | no | `SubscriptionDetailRowOrderBy`: `RECEIPT`, `PURCHASE_DATE`, `SUB_END_DATE`, `SUB_CANCEL_DATE`, `NEXT_PAYMENT_DATE`, `SUB_VALUE`, `STATUS`, `ITEM_NUMBER`, `PROCESSED_PAYMENTS_COUNT`, `FUTURE_PAYMENTS_COUNT`, `REFUND_COUNT`, `REFUND_AMOUNT`, `CHARGEBACK_COUNT`, `CHARGEBACK_AMOUNT`, `PUB_NICK_NAME`, `AFFILIATE_NICK_NAME`, `CUSTOMER_FIRST_NAME`, `CUSTOMER_LAST_NAME`, `CUSTOMER_DISPLAY_NAME`, `CUSTOMER_EMAIL`, `DURATION`, `INITIAL_SALE_AMOUNT`, `INITIAL_SALE_COUNT`, `REBILL_SALE_AMOUNT`, `REBILL_SALE_COUNT` | Customer details are only available to vendors. |
| `sortDirection` | query | no | `SortDirection`: `ASC`, `DESC` | The order in which the sorted results are returned |

**Respuestas:** `200` OK → `SubscriptionDetailResult` · `403` Forbidden → string


### `GET /rest/1.3/analytics/{role}/subscription/details/cancelsixty`

Returns a list of subscriptions canceled in the last 60 days.

**Permisos:** api_analytics_client • HAS_DEVELOPER_KEY

`operationId`: `GetSubscriptionDetailsCanceledLast60Days`

| Parámetro | En | Req. | Tipo | Descripción |
|---|---|---|---|---|
| `role` | path | sí | `RoleAccount`: `nil`, `VENDOR`, `AFFILIATE` | A valid role |
| `account` | query | sí | string | The account nickname/site. |
| `orderBy` | query | no | `SubscriptionDetailRowOrderBy`: `RECEIPT`, `PURCHASE_DATE`, `SUB_END_DATE`, `SUB_CANCEL_DATE`, `NEXT_PAYMENT_DATE`, `SUB_VALUE`, `STATUS`, `ITEM_NUMBER`, `PROCESSED_PAYMENTS_COUNT`, `FUTURE_PAYMENTS_COUNT`, `REFUND_COUNT`, `REFUND_AMOUNT`, `CHARGEBACK_COUNT`, `CHARGEBACK_AMOUNT`, `PUB_NICK_NAME`, `AFFILIATE_NICK_NAME`, `CUSTOMER_FIRST_NAME`, `CUSTOMER_LAST_NAME`, `CUSTOMER_DISPLAY_NAME`, `CUSTOMER_EMAIL`, `DURATION`, `INITIAL_SALE_AMOUNT`, `INITIAL_SALE_COUNT`, `REBILL_SALE_AMOUNT`, `REBILL_SALE_COUNT` | Customer details are only available to vendors. |
| `sortDirection` | query | no | `SortDirection`: `ASC`, `DESC` | The order in which the sorted results are returned |

**Respuestas:** `200` OK → `SubscriptionDetailResult` · `403` Forbidden → string


### `GET /rest/1.3/analytics/{role}/subscription/details/startdate`

Returns a list of subscriptions where the subscription start date is between (inclusive) the startDate and endDate parameters.

**Permisos:** api_analytics_client • HAS_DEVELOPER_KEY

`operationId`: `GetSubscriptionDetailsByStartDate`

| Parámetro | En | Req. | Tipo | Descripción |
|---|---|---|---|---|
| `role` | path | sí | `RoleAccount`: `nil`, `VENDOR`, `AFFILIATE` | A valid role |
| `account` | query | sí | string | The account nickname/site. |
| `orderBy` | query | no | `SubscriptionDetailRowOrderBy`: `RECEIPT`, `PURCHASE_DATE`, `SUB_END_DATE`, `SUB_CANCEL_DATE`, `NEXT_PAYMENT_DATE`, `SUB_VALUE`, `STATUS`, `ITEM_NUMBER`, `PROCESSED_PAYMENTS_COUNT`, `FUTURE_PAYMENTS_COUNT`, `REFUND_COUNT`, `REFUND_AMOUNT`, `CHARGEBACK_COUNT`, `CHARGEBACK_AMOUNT`, `PUB_NICK_NAME`, `AFFILIATE_NICK_NAME`, `CUSTOMER_FIRST_NAME`, `CUSTOMER_LAST_NAME`, `CUSTOMER_DISPLAY_NAME`, `CUSTOMER_EMAIL`, `DURATION`, `INITIAL_SALE_AMOUNT`, `INITIAL_SALE_COUNT`, `REBILL_SALE_AMOUNT`, `REBILL_SALE_COUNT` | Customer details are only available to vendors. |
| `sortDirection` | query | no | `SortDirection`: `ASC`, `DESC` | The order in which the sorted results are returned |
| `startDate` | query | sí | string(date) | The earliest subscription start date the result list will contain. Date Format: yyyy-MM-dd. |
| `endDate` | query | sí | string(date) | The latest subscription start date the result list will contain. Date Format: yyyy-MM-dd. |

**Respuestas:** `200` OK → `SubscriptionDetailResult` · `403` Forbidden → string


### `GET /rest/1.3/analytics/{role}/subscription/details/canceldate`

Returns a list of subscriptions where the subscription canceled date is between (inclusive) the startDate and endDate parameters.

**Permisos:** api_analytics_client • HAS_DEVELOPER_KEY

`operationId`: `GetSubscriptionDetailsByCancelDate`

| Parámetro | En | Req. | Tipo | Descripción |
|---|---|---|---|---|
| `role` | path | sí | `RoleAccount`: `nil`, `VENDOR`, `AFFILIATE` | A valid role |
| `account` | query | sí | string | The account nickname/site. |
| `orderBy` | query | no | `SubscriptionDetailRowOrderBy`: `RECEIPT`, `PURCHASE_DATE`, `SUB_END_DATE`, `SUB_CANCEL_DATE`, `NEXT_PAYMENT_DATE`, `SUB_VALUE`, `STATUS`, `ITEM_NUMBER`, `PROCESSED_PAYMENTS_COUNT`, `FUTURE_PAYMENTS_COUNT`, `REFUND_COUNT`, `REFUND_AMOUNT`, `CHARGEBACK_COUNT`, `CHARGEBACK_AMOUNT`, `PUB_NICK_NAME`, `AFFILIATE_NICK_NAME`, `CUSTOMER_FIRST_NAME`, `CUSTOMER_LAST_NAME`, `CUSTOMER_DISPLAY_NAME`, `CUSTOMER_EMAIL`, `DURATION`, `INITIAL_SALE_AMOUNT`, `INITIAL_SALE_COUNT`, `REBILL_SALE_AMOUNT`, `REBILL_SALE_COUNT` | Customer details are only available to vendors. |
| `sortDirection` | query | no | `SortDirection`: `ASC`, `DESC` | The order in which the sorted results are returned |
| `startDate` | query | sí | string(date) | The earliest subscription cancellation date the result list will contain. Date Format: yyyy-MM-dd. |
| `endDate` | query | sí | string(date) | The latest subscription cancellation date the result list will contain. Date Format: yyyy-MM-dd. |

**Respuestas:** `200` OK → `SubscriptionDetailResult` · `403` Forbidden → string


### `GET /rest/1.3/analytics/{role}/subscription/details/nextpmtdate`

Returns a list of subscriptions where the next payment date is between (inclusive) the startDate and endDate parameters.

**Permisos:** api_analytics_client • HAS_DEVELOPER_KEY

`operationId`: `GetSubscriptionDetailsByNextPaymentDate`

| Parámetro | En | Req. | Tipo | Descripción |
|---|---|---|---|---|
| `role` | path | sí | `RoleAccount`: `nil`, `VENDOR`, `AFFILIATE` | A valid role |
| `account` | query | sí | string | The account nickname/site. |
| `orderBy` | query | no | `SubscriptionDetailRowOrderBy`: `RECEIPT`, `PURCHASE_DATE`, `SUB_END_DATE`, `SUB_CANCEL_DATE`, `NEXT_PAYMENT_DATE`, `SUB_VALUE`, `STATUS`, `ITEM_NUMBER`, `PROCESSED_PAYMENTS_COUNT`, `FUTURE_PAYMENTS_COUNT`, `REFUND_COUNT`, `REFUND_AMOUNT`, `CHARGEBACK_COUNT`, `CHARGEBACK_AMOUNT`, `PUB_NICK_NAME`, `AFFILIATE_NICK_NAME`, `CUSTOMER_FIRST_NAME`, `CUSTOMER_LAST_NAME`, `CUSTOMER_DISPLAY_NAME`, `CUSTOMER_EMAIL`, `DURATION`, `INITIAL_SALE_AMOUNT`, `INITIAL_SALE_COUNT`, `REBILL_SALE_AMOUNT`, `REBILL_SALE_COUNT` | Customer details are only available to vendors. |
| `sortDirection` | query | no | `SortDirection`: `ASC`, `DESC` | The order in which the sorted results are returned |
| `startDate` | query | sí | string(date) | The earliest next subscription payment date the result list will contain. Date Format: yyyy-MM-dd. |
| `endDate` | query | sí | string(date) | The latest next subscription payment date the result list will contain. Date Format: yyyy-MM-dd. |

**Respuestas:** `200` OK → `SubscriptionDetailResult` · `403` Forbidden → string


### `GET /rest/1.3/analytics/{role}/subscription/details/status`

**Permisos:** api_analytics_client • HAS_DEVELOPER_KEY

`operationId`: `GetSubscriptionDetailsByStatusDate`

| Parámetro | En | Req. | Tipo | Descripción |
|---|---|---|---|---|
| `role` | path | sí | `RoleAccount`: `nil`, `VENDOR`, `AFFILIATE` | A valid role |
| `account` | query | sí | string | The account nickname/site. |
| `orderBy` | query | no | `SubscriptionDetailRowOrderBy`: `RECEIPT`, `PURCHASE_DATE`, `SUB_END_DATE`, `SUB_CANCEL_DATE`, `NEXT_PAYMENT_DATE`, `SUB_VALUE`, `STATUS`, `ITEM_NUMBER`, `PROCESSED_PAYMENTS_COUNT`, `FUTURE_PAYMENTS_COUNT`, `REFUND_COUNT`, `REFUND_AMOUNT`, `CHARGEBACK_COUNT`, `CHARGEBACK_AMOUNT`, `PUB_NICK_NAME`, `AFFILIATE_NICK_NAME`, `CUSTOMER_FIRST_NAME`, `CUSTOMER_LAST_NAME`, `CUSTOMER_DISPLAY_NAME`, `CUSTOMER_EMAIL`, `DURATION`, `INITIAL_SALE_AMOUNT`, `INITIAL_SALE_COUNT`, `REBILL_SALE_AMOUNT`, `REBILL_SALE_COUNT` | Customer details are only available to vendors. |
| `sortDirection` | query | no | `SortDirection`: `ASC`, `DESC` | The order in which the sorted results are returned |
| `status` | query | sí | `SubscriptionStatus`: `nil`, `ACTIVE`, `COMPLETED`, `CANCELED`, `RETRY_PAYMENT`, `REQUEST_NEW_CARD` | The subscription status. |

**Respuestas:** `200` OK → `SubscriptionDetailResult` · `403` Forbidden → string


### `GET /rest/1.3/analytics/{role}/subscription/details`

Returns a list of subscriptions details.

**Permisos:** api_analytics_client • HAS_DEVELOPER_KEY

`operationId`: `GetSubscriptionDetails`

| Parámetro | En | Req. | Tipo | Descripción |
|---|---|---|---|---|
| `role` | path | sí | `RoleAccount`: `nil`, `VENDOR`, `AFFILIATE` | A valid role |
| `account` | query | sí | string | The account nickname/site. |
| `orderBy` | query | no | `SubscriptionDetailRowOrderBy`: `RECEIPT`, `PURCHASE_DATE`, `SUB_END_DATE`, `SUB_CANCEL_DATE`, `NEXT_PAYMENT_DATE`, `SUB_VALUE`, `STATUS`, `ITEM_NUMBER`, `PROCESSED_PAYMENTS_COUNT`, `FUTURE_PAYMENTS_COUNT`, `REFUND_COUNT`, `REFUND_AMOUNT`, `CHARGEBACK_COUNT`, `CHARGEBACK_AMOUNT`, `PUB_NICK_NAME`, `AFFILIATE_NICK_NAME`, `CUSTOMER_FIRST_NAME`, `CUSTOMER_LAST_NAME`, `CUSTOMER_DISPLAY_NAME`, `CUSTOMER_EMAIL`, `DURATION`, `INITIAL_SALE_AMOUNT`, `INITIAL_SALE_COUNT`, `REBILL_SALE_AMOUNT`, `REBILL_SALE_COUNT` | Customer details are only available to vendors. |
| `sortDirection` | query | no | `SortDirection`: `ASC`, `DESC` | The order in which the sorted results are returned |

**Respuestas:** `200` OK → `SubscriptionDetailResult` · `403` Forbidden → string


### `GET /rest/1.3/analytics/{role}/subscription/trends`

Returns statistical summations of data for subscriptions.

**Permisos:** api_analytics_client • HAS_DEVELOPER_KEY

`operationId`: `GetSubscriptionTrends`

| Parámetro | En | Req. | Tipo | Descripción |
|---|---|---|---|---|
| `role` | path | sí | `RoleAccount`: `nil`, `VENDOR`, `AFFILIATE` | A valid role |
| `account` | query | sí | string | The account nickname/site. |
| `groupBy` | query | no | string | You may group by business date by passing DATE as the value. |
| `productId` | query | no | integer(int32) | The product id to report on, multiple parameter/value pairs may be passed. |
| `startDate` | query | sí | string(date) | The start date (inclusive) of the time frame to report on - format is yyyy-MM-dd. |
| `endDate` | query | sí | string(date) | The end date (inclusive) of the time frame to report on - format is yyyy-MM-dd. |
| `page` | header | no | integer(int32) | The page number of the results (default is page 1). |

**Respuestas:** `200` OK → `SubscriptionTrendsData` · `206` Partial Content → `SubscriptionTrendsData` · `403` Forbidden → string


### `GET /rest/1.3/analytics/{role}/{dimension}`

Returns statistical data for a given role and dimension.

**Permisos:** api_analytics_client • HAS_DEVELOPER_KEY

`operationId`: `GetStatisticsByRoleAndDimension`

| Parámetro | En | Req. | Tipo | Descripción |
|---|---|---|---|---|
| `role` | path | sí | `RoleAccount`: `nil`, `VENDOR`, `AFFILIATE` | A valid role |
| `dimension` | path | sí | `Dimension`: `AFFILIATE`, `CUSTOMER_CURRENCY`, `CUSTOMER_COUNTRY`, `CUSTOMER_PROVINCE`, `CUSTOMER_LANGUAGE`, `PRODUCT_SKU`, `TRACKING_ID`, `VENDOR`, `VENDOR_CATEGORY`, `VENDOR_PRODUCT_SKU` | PRODUCT_SKU – Only available if role = VENDOR VENDOR_PRODUCT_SKU – Only available if role = AFFILIATE |
| `account` | query | sí | string | Account/site to query for. |
| `startDate` | query | no | string(date) | The start date of the time frame to report on - format is yyyy-MM-dd. Defaults to the previous day. |
| `endDate` | query | no | string(date) | The end date of the time frame to report on - format is yyyy-MM-dd. Defaults to the current day. |
| `dimensionFilter` | query | no | `Dimension`: `AFFILIATE`, `CUSTOMER_CURRENCY`, `CUSTOMER_COUNTRY`, `CUSTOMER_PROVINCE`, `CUSTOMER_LANGUAGE`, `PRODUCT_SKU`, `TRACKING_ID`, `VENDOR`, `VENDOR_CATEGORY`, `VENDOR_PRODUCT_SKU` | This parameter limits the results returned to ones with a matching dimension id. This value is case sensitive. |
| `select` | query | no | array<`DimensionColumn` enum> | This optional parameter specifies the data fields to return. Multiple select parameters may be passed to select multiple values. If this parameter is absent all values will be returned. |
| `orderBy` | query | no | `DimensionColumn`: `CHARGEBACK_AMOUNT`, `CHARGEBACK_COUNT`, `CHARGEBACK_RATE`, `DIMENSION_VALUE`, `EARNINGS_PER_HOP`, `GROSS_SALE_COUNT`, `GROSS_SALE_AMOUNT`, `HOP_COUNT`, `HOPS_PER_SALE`, `HOPS_PER_ORDER_FORM_IMPRESSION`, `NET_SALE_AMOUNT`, `NET_SALE_COUNT`, `ORDER_FORM_SALE_CONVERSION`, `ORDER_IMPRESSION`, `ORDER_SUBMISSION`, `REBILL_AMOUNT`, `REBILL_COUNT`, `REFUND_AMOUNT`, `REFUND_COUNT`, `REFUND_RATE`, `SALE_AMOUNT`, `SALE_COUNT`, `UPSELL_AMOUNT`, `UPSELL_COUNT` | This optional parameter specifies which data field the results should be ordered by. |
| `sortAscending` | query | no | boolean | When an order by is included this may be specified with a value of true to sort ascending instead of descending |
| `page` | header | no | integer(int32) | The page number of the results (default is page 1). |

**Respuestas:** `200` OK → `AnalyticsResult` · `206` Partial Content → `AnalyticsResult` · `403` Forbidden → string


### `GET /rest/1.3/analytics/{role}/{dimension}/summary`

Returns summary statistical data for a given role, dimension, and summary type.

**Permisos:** api_analytics_client • HAS_DEVELOPER_KEY

`operationId`: `GetStatisticsByRoleAndDimensionSummary`

| Parámetro | En | Req. | Tipo | Descripción |
|---|---|---|---|---|
| `role` | path | sí | `RoleAccount`: `nil`, `VENDOR`, `AFFILIATE` | A valid role |
| `dimension` | path | sí | `Dimension`: `AFFILIATE`, `CUSTOMER_CURRENCY`, `CUSTOMER_COUNTRY`, `CUSTOMER_PROVINCE`, `CUSTOMER_LANGUAGE`, `PRODUCT_SKU`, `TRACKING_ID`, `VENDOR`, `VENDOR_CATEGORY`, `VENDOR_PRODUCT_SKU` | PRODUCT_SKU – Only available if role = VENDOR VENDOR_PRODUCT_SKU – Only available if role = AFFILIATE |
| `account` | query | sí | string | Account/site to query for. |
| `summaryType` | query | sí | `SummaryType`: `VENDOR_ONLY`, `AFFILIATE_ONLY` | This parameter specifies which type of summary data is desired. VENDOR_ONLY - this shows summary information for only the selected account AFFILIATE_ONLY - this shows summary information which excludes the selected account |
| `startDate` | query | no | string(date) | The start date of the time frame to report on - format is yyyy-MM-dd. Defaults to the previous day. |
| `endDate` | query | no | string(date) | The end date of the time frame to report on - format is yyyy-MM-dd. Defaults to the current day. |
| `dimensionFilter` | query | no | `Dimension`: `AFFILIATE`, `CUSTOMER_CURRENCY`, `CUSTOMER_COUNTRY`, `CUSTOMER_PROVINCE`, `CUSTOMER_LANGUAGE`, `PRODUCT_SKU`, `TRACKING_ID`, `VENDOR`, `VENDOR_CATEGORY`, `VENDOR_PRODUCT_SKU` | This parameter limits the results returned to ones with a matching dimension id. This value is case sensitive. |
| `select` | query | no | array<`DimensionColumn` enum> | This optional parameter specifies the data fields to return. Multiple select parameters may be passed to select multiple values. If this parameter is absent all values will be returned. |
| `orderBy` | query | no | `DimensionColumn`: `CHARGEBACK_AMOUNT`, `CHARGEBACK_COUNT`, `CHARGEBACK_RATE`, `DIMENSION_VALUE`, `EARNINGS_PER_HOP`, `GROSS_SALE_COUNT`, `GROSS_SALE_AMOUNT`, `HOP_COUNT`, `HOPS_PER_SALE`, `HOPS_PER_ORDER_FORM_IMPRESSION`, `NET_SALE_AMOUNT`, `NET_SALE_COUNT`, `ORDER_FORM_SALE_CONVERSION`, `ORDER_IMPRESSION`, `ORDER_SUBMISSION`, `REBILL_AMOUNT`, `REBILL_COUNT`, `REFUND_AMOUNT`, `REFUND_COUNT`, `REFUND_RATE`, `SALE_AMOUNT`, `SALE_COUNT`, `UPSELL_AMOUNT`, `UPSELL_COUNT` | This optional parameter specifies which data field the results should be ordered by. |
| `sortAscending` | query | no | boolean | When an order by is included this may be specified with a value of true to sort ascending instead of descending |
| `page` | header | no | integer(int32) | The page number of the results (default is page 1). |

**Respuestas:** `200` OK → `AnalyticsResult` · `206` Partial Content → `AnalyticsResult` · `403` Forbidden → string


## Debug

The ClickBank APIs include a debugging service

| Método | Ruta | Qué hace |
|---|---|---|
| `GET` | `/rest/1.3/debug` | When you send a request to the debugging service, it returns the request context information including the sec |


### `GET /rest/1.3/debug`

When you send a request to the debugging service, it returns the request context information including the security context information. This can be useful when correcting issues with the ClickBank APIs.

`operationId`: `GetDebug`

**Respuestas:** `200` OK → string · `403` Forbidden → string


## Images

The Images API lists the images associated with an account  
Doc oficial: https://api.clickbank.com/rest/1.3/images

| Método | Ruta | Qué hace |
|---|---|---|
| `GET` | `/rest/1.3/images/list` | Lists images associated with a site |


### `GET /rest/1.3/images/list`

Lists images associated with a site

**Permisos:** api_products_client • HAS_DEVELOPER_KEY

`operationId`: `GetImages`

| Parámetro | En | Req. | Tipo | Descripción |
|---|---|---|---|---|
| `site` | query | no | string | The site owning the images |
| `type` | query | no | `ImageType`: `nil`, `PRODUCT`, `BANNER`, `BANNER_CLASSIC`, `BANNER_NEW`, `BANNER_BG`, `CUSTOM_BANNER`, `CUSTOM_BANNER_BG`, `CUSTOM_ORDERFORM` | The image type. Must be PRODUCT, BANNER, or BANNER_BG |
| `approvedOnly` | query | no | boolean | boolean - if true only approved images [Default = true] |
| `page` | query | no | integer(int32) | Page Number. Results only return 100 records at a time |

**Respuestas:** `200` OK → `ImageListResult` · `206` Partial Content → `ImageListResult` · `403` Forbidden → string


## Orders

The Orders API lets you view order information and update some order parameters  
Doc oficial: https://api.clickbank.com/rest/1.3/orders

| Método | Ruta | Qué hace |
|---|---|---|
| `POST` | `/rest/1.3/orders/{receipt}/reinstate` | *BETA* Allows a vendor to restart a cancelled subscription |
| `POST` | `/rest/1.3/orders/{receipt}/pause` | *BETA* Allows a vendor to change the rebill date of a subscription |
| `POST` | `/rest/1.3/orders/{receipt}/extend` | *BETA* Allows a vendor to extend a subscription by a given number of rebill periods |
| `POST` | `/rest/1.3/orders/{receipt}/changeProduct` | *BETA* Allows a vendor to change (upgrade or downgrade) the product associated with a subscription. |
| `POST` | `/rest/1.3/orders/{receipt}/changeAddress` | Allows a vendor to change shipping address of a physical recurring subscription. |
| `GET` | `/rest/1.3/orders/count` | Same as the list command, except that this one returns the count of the orders returned based on the search cr |
| `GET` | `/rest/1.3/orders/list` | List orders for the authenticated user scoped to the search criteria. Only the first 100 orders will be return |
| `HEAD` | `/rest/1.3/orders/{receipt}` | This head request is used to identify if a particular order or a subscription is active, i.e. it has not been  |
| `GET` | `/rest/1.3/orders/{receipt}` | Returns a list of order detail objects which match the given receipt. |
| `GET` | `/rest/1.3/orders/{receipt}/upsells` | Returns all the upsell transactions for the given parent upsell transaction. |


### `POST /rest/1.3/orders/{receipt}/reinstate`

*BETA* Allows a vendor to restart a cancelled subscription

**Permisos:** HAS_DEVELOPER_KEY • api_subscription_modifications

`operationId`: `ReinstateOrder`

| Parámetro | En | Req. | Tipo | Descripción |
|---|---|---|---|---|
| `receipt` | path | sí | string |  |
| `sku` | query | no | string | The item number of the subscription product that should be reinstated for the order |

**Respuestas:** `204` No Content · `403` Forbidden → string


### `POST /rest/1.3/orders/{receipt}/pause`

*BETA* Allows a vendor to change the rebill date of a subscription

**Permisos:** HAS_DEVELOPER_KEY • api_subscription_modifications

`operationId`: `PauseOrder`

| Parámetro | En | Req. | Tipo | Descripción |
|---|---|---|---|---|
| `receipt` | path | sí | string |  |
| `restartDate` | query | no | string(date) | The date when the subscription will be resumed in format yyyy-mm-dd |
| `sku` | query | no | string | The item number of the subscription product that should be reinstated for the order |

**Respuestas:** `204` No Content · `403` Forbidden → string


### `POST /rest/1.3/orders/{receipt}/extend`

*BETA* Allows a vendor to extend a subscription by a given number of rebill periods

**Permisos:** HAS_DEVELOPER_KEY • api_subscription_modifications

`operationId`: `ExtendOrder`

| Parámetro | En | Req. | Tipo | Descripción |
|---|---|---|---|---|
| `receipt` | path | sí | string |  |
| `numPeriods` | query | no | integer(int32) | The number of periods to extend the subscription by |
| `sku` | query | no | string | sku/itemNo of the line item. Used to identify individual purchase in multi-item cart purchase |

**Respuestas:** `204` No Content · `403` Forbidden → string


### `POST /rest/1.3/orders/{receipt}/changeProduct`

*BETA* Allows a vendor to change (upgrade or downgrade) the product associated with a subscription.

**Permisos:** HAS_DEVELOPER_KEY • api_order_write • api_subscription_modifications

`operationId`: `ChangeProductOrder`

| Parámetro | En | Req. | Tipo | Descripción |
|---|---|---|---|---|
| `receipt` | path | sí | string |  |
| `oldSku` | query | no | string | The SKU of the current product for the subscription. |
| `newSku` | query | no | string | The SKU of the new product for the subscription. |
| `carryAffiliate` | query | no | boolean | Determines if the affiliate from the original transaction is carried over to the new subscription. |
| `applyProratedRefund` | query | no | boolean | Determines if the prorated refund should be applied on the product change. This parameter will default to TRUE if not explicitly set |
| `nextRebillDate` | query | no | string(date) | Allows the vendor to change the date of the next rebill. Date Format is YYYY-MM-DD. Not passing in any value will set the next rebill date to the next day of product change |

**Respuestas:** `204` No Content · `403` Forbidden → string


### `POST /rest/1.3/orders/{receipt}/changeAddress`

Allows a vendor to change shipping address of a physical recurring subscription.

**Permisos:** HAS_DEVELOPER_KEY • api_order_write

`operationId`: `ChangeAddressOrder`

| Parámetro | En | Req. | Tipo | Descripción |
|---|---|---|---|---|
| `receipt` | path | sí | string |  |
| `address1` | query | no | string | Updated address (line 1). |
| `city` | query | no | string | Updated city. |
| `countryCode` | query | no | string | Updated country code. |
| `firstName` | query | no | string | Updated customer first name. |
| `lastName` | query | no | string | Updated customer last name. |
| `address2` | query | no | string | Updated address (line 2). |
| `county` | query | no | string | Updated county. |
| `province` | query | no | string | Updated state or province. |
| `postalCode` | query | no | string | Updated postal code or Zip. |

**Respuestas:** `204` No Content · `403` Forbidden → string


### `GET /rest/1.3/orders/count`

Same as the list command, except that this one returns the count of the orders returned based on the search criteria.

**Permisos:** api_order_read • HAS_DEVELOPER_KEY

`operationId`: `GetOrderCount`

| Parámetro | En | Req. | Tipo | Descripción |
|---|---|---|---|---|
| `startDate` | query | no | string(date) | The beginning date for the search (yyyy-mm-dd) |
| `endDate` | query | no | string(date) | The end date for the search (yyyy-mm-dd) |
| `type` | query | no | `TransactionType`: `nil`, `SALE`, `RFND`, `CGBK`, `FEE`, `BILL`, `TEST_SALE`, `TEST_BILL`, `TEST_RFND`, `TEST_FEE` | The type of transactions to be returned. Supported types are [SALE / RFND / CGBK / FEE / BILL / TEST_SALE / TEST_BILL / TEST_RFND / TEST_FEE]. If not specified all types will be returned. If an invalid type is specified, no transactions will be returned. |
| `vendor` | query | no | string | The vendor name. Supports wildcard searches using the '%' character. (Wildcards are converted to %25 after url encoding is done by the client) |
| `affiliate` | query | no | string | The affiliate name. Supports the word 'none' to search for transactions without affiliates, and wildcard searches using the '%' character. (Wilcards are converted to %25 after url encoding is done by the client) |
| `lastName` | query | no | string | Customers last name. Supports wildcard searches using the '%' character. (Wildcards are converted to %25 after url encoding is done by the client) |
| `email` | query | no | string | The email of the customer. Supports wildcard searches using the '%' character. (Wildcards are converted to %25 after url encoding is done by the client) |
| `tid` | query | no | string | The TID (Tracking ID / Promo Code) to search on. This will search both vendor and affiliate tracking codes and be returned in the promo field |
| `role` | query | no | `RoleAccount`: `nil`, `VENDOR`, `AFFILIATE` | Role account was of transaction options are [VENDOR, AFFILIATE] |

**Respuestas:** `200` OK → integer(int32) · `403` Forbidden → string


### `GET /rest/1.3/orders/list`

List orders for the authenticated user scoped to the search criteria. Only the first 100 orders will be returned. This method supports pagination, so if the second page of the next 100 items is required a request header 'Page' with value 2 will return them.

**Permisos:** api_order_read • HAS_DEVELOPER_KEY

`operationId`: `GetOrders`

| Parámetro | En | Req. | Tipo | Descripción |
|---|---|---|---|---|
| `startDate` | query | no | string(date) | The beginning date for the search (yyyy-mm-dd). If a startDate is specified, you must also specify an endDate. |
| `endDate` | query | no | string(date) | The end date for the search (yyyy-mm-dd). If an endDate is specified, you must also specify a startDate. |
| `type` | query | no | `TransactionType`: `nil`, `SALE`, `RFND`, `CGBK`, `FEE`, `BILL`, `TEST_SALE`, `TEST_BILL`, `TEST_RFND`, `TEST_FEE` | The type of transactions to be returned. Supported types are [SALE / RFND / CGBK / FEE / BILL / TEST_SALE / TEST_BILL / TEST_RFND /TEST_FEE]. If not specified all types will be returned. If an invalid type is specified, no transactions will be returned. |
| `vendor` | query | no | string | The vendor name. Supports wildcard searches using the '%' character. (Wildcards are converted to %25 after url encoding is done by the client) |
| `affiliate` | query | no | string | The affiliate name. Supports the word 'none' to search for transactions without affiliates, and wildcard searches using the '%' character. (Wilcards are converted to %25 after url encoding is done by the client) |
| `lastName` | query | no | string | Customers last name. Supports wildcard searches using the '%' character. (Wildcards are converted to %25 after url encoding is done by the client) |
| `item` | query | no | string | The item number of the order |
| `email` | query | no | string | The email of the customer. Supports wildcard searches using the '%' character. (Wildcards are converted to %25 after url encoding is done by the client) |
| `tid` | query | no | string | The TID (Tracking ID / Promo Code) to search on. This will search both vendor and affiliate tracking codes and be returned in the promo field |
| `role` | query | no | `RoleAccount`: `nil`, `VENDOR`, `AFFILIATE` | Role account was of transaction options are [VENDOR, AFFILIATE] |
| `postalCode` | query | no | string | Customer's zip or postal code. Supports wildcard searches. |
| `amount` | query | no | number(double) | The transaction total amount |
| `page` | header | no | integer(int32) | Page Number. Results only return 100 records at a time |

**Respuestas:** `200` OK → `OrderList` · `206` Partial Content → `OrderList` · `403` Forbidden → string


### `HEAD /rest/1.3/orders/{receipt}`

This head request is used to identify if a particular order or a subscription is active, i.e. it has not been refunded, chargebacked or cancelled. It will return a 403 (Forbidden) if that's the case, or a 204 if the order is still active. Note that it will also return a 403 if the order is not found, or the user does not have access to that receipt.

**Permisos:** api_order_read • HAS_DEVELOPER_KEY

`operationId`: `GetOrderStatus`

| Parámetro | En | Req. | Tipo | Descripción |
|---|---|---|---|---|
| `receipt` | path | sí | string |  |
| `sku` | query | no | string | sku/itemNo of the line item. Used to identify individual purchase in multi-item cart purchase |

**Respuestas:** `204` No Content · `403` Forbidden → string


### `GET /rest/1.3/orders/{receipt}`

Returns a list of order detail objects which match the given receipt.

**Permisos:** api_order_read • HAS_DEVELOPER_KEY

`operationId`: `GetOrder`

| Parámetro | En | Req. | Tipo | Descripción |
|---|---|---|---|---|
| `receipt` | path | sí | string |  |
| `sku` | query | no | string | sku/itemNo of the line item. Used to identify individual purchase in multi-item cart purchase |

**Respuestas:** `200` OK → `OrderList` · `403` Forbidden → string


### `GET /rest/1.3/orders/{receipt}/upsells`

Returns all the upsell transactions for the given parent upsell transaction.

**Permisos:** api_order_read • HAS_DEVELOPER_KEY

`operationId`: `GetOrderUpsells`

| Parámetro | En | Req. | Tipo | Descripción |
|---|---|---|---|---|
| `receipt` | path | sí | string |  |

**Respuestas:** `200` OK → `OrderList` · `204` No Content · `403` Forbidden → string


## Orders2

The Orders API lets you view order information and update some order parameters  
Doc oficial: https://api.clickbank.com/rest/1.3/orders2

| Método | Ruta | Qué hace |
|---|---|---|
| `POST` | `/rest/1.3/orders2/{receipt}/changeAddress` | Allows a vendor to change shipping address of a physical recurring subscription. |
| `POST` | `/rest/1.3/orders2/{receipt}/changeDate` | *BETA* Allows a vendor to change the rebill date of a subscription |
| `POST` | `/rest/1.3/orders2/{receipt}/changeProduct` | *BETA* Allows a vendor to change (upgrade or downgrade) the product associated with a subscription. |
| `POST` | `/rest/1.3/orders2/{receipt}/extend` | *BETA* Allows a vendor to extend a subscription by a given number of rebill periods |
| `GET` | `/rest/1.3/orders2/{receipt}` | Returns a list of order detail objects which match the given receipt. |
| `HEAD` | `/rest/1.3/orders2/{receipt}` | This head request is used to identify if a particular order or a subscription is active, i.e. it has not been  |
| `GET` | `/rest/1.3/orders2/count` | Same as the list command, except that this one returns the count of the orders returned based on the search cr |
| `GET` | `/rest/1.3/orders2/list` | List orders for the authenticated user scoped to the search criteria. Only the first 100 orders will be return |
| `GET` | `/rest/1.3/orders2/{receipt}/upsells` | Returns all the upsell transactions for the given parent upsell transaction. |
| `POST` | `/rest/1.3/orders2/{receipt}/pause` | *BETA* Allows a vendor to change the rebill date of a subscription |
| `POST` | `/rest/1.3/orders2/{receipt}/reinstate` | *BETA* Allows a vendor to restart a cancelled subscription |


### `POST /rest/1.3/orders2/{receipt}/changeAddress`

Allows a vendor to change shipping address of a physical recurring subscription.

**Permisos:** HAS_DEVELOPER_KEY • api_order_write

`operationId`: `ChangeAddressOrder`

| Parámetro | En | Req. | Tipo | Descripción |
|---|---|---|---|---|
| `receipt` | path | sí | string |  |
| `address1` | query | no | string | Updated address (line 1). |
| `city` | query | no | string | Updated city. |
| `countryCode` | query | no | string | Updated country code. |
| `firstName` | query | no | string | Updated customer first name. |
| `lastName` | query | no | string | Updated customer last name. |
| `address2` | query | no | string | Updated address (line 2). |
| `county` | query | no | string | Updated county. |
| `province` | query | no | string | Updated state or province. |
| `postalCode` | query | no | string | Updated postal code or Zip. |

**Respuestas:** `204` No Content · `403` Forbidden → string


### `POST /rest/1.3/orders2/{receipt}/changeDate`

*BETA* Allows a vendor to change the rebill date of a subscription

**Permisos:** HAS_DEVELOPER_KEY • api_subscription_modifications

`operationId`: `ChangeDateOrder`

| Parámetro | En | Req. | Tipo | Descripción |
|---|---|---|---|---|
| `receipt` | path | sí | string |  |
| `changeDate` | query | no | string(date) | The date when the subscription will be next billed in format yyyy-mm-dd |
| `sku` | query | no | string | sku/itemNo of the line item. Used to identify individual purchase in multi-item cart purchase |

**Respuestas:** `204` No Content · `403` Forbidden → string


### `POST /rest/1.3/orders2/{receipt}/changeProduct`

*BETA* Allows a vendor to change (upgrade or downgrade) the product associated with a subscription.

**Permisos:** HAS_DEVELOPER_KEY • api_order_write • api_subscription_modifications

`operationId`: `ChangeProductOrder`

| Parámetro | En | Req. | Tipo | Descripción |
|---|---|---|---|---|
| `receipt` | path | sí | string |  |
| `oldSku` | query | no | string | The SKU of the current product for the subscription. |
| `newSku` | query | no | string | The SKU of the new product for the subscription. |
| `carryAffiliate` | query | no | boolean | Determines if the affiliate from the original transaction is carried over to the new subscription. |
| `applyProratedRefund` | query | no | boolean | Determines if the pro rated refund should be applied on the product change. This parameter will default to TRUE if not explicitly set |
| `nextRebillDate` | query | no | string(date) | Allows the vendor to change the date of the next rebill. Date Format is YYYY-MM-DD. Not passing in any value will set the next rebill date to the next day of product change |

**Respuestas:** `204` No Content · `403` Forbidden → string


### `POST /rest/1.3/orders2/{receipt}/extend`

*BETA* Allows a vendor to extend a subscription by a given number of rebill periods

**Permisos:** HAS_DEVELOPER_KEY • api_subscription_modifications

`operationId`: `ExtendOrder`

| Parámetro | En | Req. | Tipo | Descripción |
|---|---|---|---|---|
| `receipt` | path | sí | string |  |
| `numPeriods` | query | no | integer(int32) | The number of periods to extend the subscription by |
| `sku` | query | no | string | sku/itemNo of the line item. Used to identify individual purchase in multi-item cart purchase |

**Respuestas:** `204` No Content · `403` Forbidden → string


### `GET /rest/1.3/orders2/{receipt}`

Returns a list of order detail objects which match the given receipt.

**Permisos:** api_order_read • HAS_DEVELOPER_KEY

`operationId`: `GetOrder`

| Parámetro | En | Req. | Tipo | Descripción |
|---|---|---|---|---|
| `receipt` | path | sí | string |  |
| `sku` | query | no | string | sku/itemNo of the line item. Used to identify individual purchase in multi-item cart purchase |

**Respuestas:** `200` OK → `OrderList` · `403` Forbidden → string


### `HEAD /rest/1.3/orders2/{receipt}`

This head request is used to identify if a particular order or a subscription is active, i.e. it has not been refunded, chargebacked or cancelled. It will return a 403 (Forbidden) if that's the case, or a 204 if the order is still active. Note that it will also return a 403 if the order is not found, or the user does not have access to that receipt.

**Permisos:** api_order_read • HAS_DEVELOPER_KEY

`operationId`: `GetOrderStatus`

| Parámetro | En | Req. | Tipo | Descripción |
|---|---|---|---|---|
| `receipt` | path | sí | string |  |
| `sku` | query | no | string | sku/itemNo of the line item. Used to identify individual purchase in multi-item cart purchase |

**Respuestas:** `204` No Content · `403` Forbidden → string


### `GET /rest/1.3/orders2/count`

Same as the list command, except that this one returns the count of the orders returned based on the search criteria.

**Permisos:** api_order_read • HAS_DEVELOPER_KEY

`operationId`: `GetOrderCount`

| Parámetro | En | Req. | Tipo | Descripción |
|---|---|---|---|---|
| `startDate` | query | no | string(date) | The beginning date for the search (yyyy-mm-dd) |
| `endDate` | query | no | string(date) | The end date for the search (yyyy-mm-dd) |
| `type` | query | no | `TransactionType`: `nil`, `SALE`, `RFND`, `CGBK`, `FEE`, `BILL`, `TEST_SALE`, `TEST_BILL`, `TEST_RFND`, `TEST_FEE` | The type of transactions to be returned. Supported types are [SALE / RFND / CGBK / FEE / BILL / TEST_SALE / TEST_BILL / TEST_RFND / TEST_FEE]. If not specified all types will be returned. If an invalid type is specified, no transactions will be returned. |
| `vendor` | query | no | string | The vendor name. Supports wildcard searches using the '%' character. (Wildcards are converted to %25 after url encoding is done by the client) |
| `affiliate` | query | no | string | The affiliate name. Supports the word 'none' to search for transactions without affiliates, and wildcard searches using the '%' character. (Wilcards are converted to %25 after url encoding is done by the client) |
| `lastName` | query | no | string | Customers last name. Supports wildcard searches using the '%' character. (Wildcards are converted to %25 after url encoding is done by the client) |
| `item` | query | no | string | The item number of the order |
| `email` | query | no | string | The email of the customer. Supports wildcard searches using the '%' character. (Wildcards are converted to %25 after url encoding is done by the client) |
| `tid` | query | no | string | The TID (Tracking ID / Promo Code) to search on. This will search both vendor and affiliate tracking codes and be returned in the promo field |
| `postalCode` | query | no | string | Customer's zip or postal code. Supports wildcard searches. |
| `role` | query | no | `RoleAccount`: `nil`, `VENDOR`, `AFFILIATE` | Role account was of transaction options are [VENDOR, AFFILIATE] |

**Respuestas:** `200` OK → integer(int32) · `403` Forbidden → string


### `GET /rest/1.3/orders2/list`

List orders for the authenticated user scoped to the search criteria. Only the first 100 orders will be returned. This method supports pagination, so if the second page of the next 100 items is required a request header 'Page' with value 2 will return them.

**Permisos:** api_order_read • HAS_DEVELOPER_KEY

`operationId`: `GetOrders`

| Parámetro | En | Req. | Tipo | Descripción |
|---|---|---|---|---|
| `startDate` | query | no | string(date) | The beginning date for the search (yyyy-mm-dd). If a startDate is specified, you must also specify an endDate. |
| `endDate` | query | no | string(date) | The end date for the search (yyyy-mm-dd). If an endDate is specified, you must also specify a startDate. |
| `type` | query | no | `TransactionType`: `nil`, `SALE`, `RFND`, `CGBK`, `FEE`, `BILL`, `TEST_SALE`, `TEST_BILL`, `TEST_RFND`, `TEST_FEE` | The type of transactions to be returned. Supported types are [SALE / RFND / CGBK / FEE / BILL / TEST_SALE / TEST_BILL / TEST_RFND /TEST_FEE]. If not specified all types will be returned. If an invalid type is specified, no transactions will be returned. |
| `vendor` | query | no | string | The vendor name. Supports wildcard searches using the '%' character. (Wildcards are converted to %25 after url encoding is done by the client) |
| `affiliate` | query | no | string | The affiliate name. Supports the word 'none' to search for transactions without affiliates, and wildcard searches using the '%' character. (Wilcards are converted to %25 after url encoding is done by the client) |
| `lastName` | query | no | string | Customers last name. Supports wildcard searches using the '%' character. (Wildcards are converted to %25 after url encoding is done by the client) |
| `item` | query | no | string | The item number of the order |
| `email` | query | no | string | The email of the customer. Supports wildcard searches using the '%' character. (Wildcards are converted to %25 after url encoding is done by the client) |
| `tid` | query | no | string | The TID (Tracking ID / Promo Code) to search on. This will search both vendor and affiliate tracking codes and be returned in the promo field |
| `role` | query | no | `RoleAccount`: `nil`, `VENDOR`, `AFFILIATE` | Role account was of transaction options are [VENDOR, AFFILIATE] |
| `postalCode` | query | no | string | Customer's zip or postal code. Supports wildcard searches. |
| `amount` | query | no | number(double) | The transaction total amount |
| `page` | header | no | integer(int32) | Page Number. Results only return 100 records at a time |

**Respuestas:** `200` OK → `OrderList` · `206` Partial Content → `OrderList` · `403` Forbidden → string


### `GET /rest/1.3/orders2/{receipt}/upsells`

Returns all the upsell transactions for the given parent upsell transaction.

**Permisos:** api_order_read • HAS_DEVELOPER_KEY

`operationId`: `GetOrderUpsells`

| Parámetro | En | Req. | Tipo | Descripción |
|---|---|---|---|---|
| `receipt` | path | sí | string |  |

**Respuestas:** `200` OK → `OrderList` · `204` No Content · `403` Forbidden → string


### `POST /rest/1.3/orders2/{receipt}/pause`

*BETA* Allows a vendor to change the rebill date of a subscription

**Permisos:** HAS_DEVELOPER_KEY • api_subscription_modifications

`operationId`: `PauseOrder`

| Parámetro | En | Req. | Tipo | Descripción |
|---|---|---|---|---|
| `receipt` | path | sí | string |  |
| `restartDate` | query | no | string(date) | The date when the subscription will be resumed in format yyyy-mm-dd |
| `sku` | query | no | string | The item number of the subscription product that should be reinstated for the order |

**Respuestas:** `204` No Content · `403` Forbidden → string


### `POST /rest/1.3/orders2/{receipt}/reinstate`

*BETA* Allows a vendor to restart a cancelled subscription

**Permisos:** HAS_DEVELOPER_KEY • api_subscription_modifications

`operationId`: `ReinstateOrder`

| Parámetro | En | Req. | Tipo | Descripción |
|---|---|---|---|---|
| `receipt` | path | sí | string |  |
| `sku` | query | no | string | The item number of the subscription product that should be reinstated for the order |

**Respuestas:** `204` No Content · `403` Forbidden → string


## Products

The Products API lets you perform CRUD product management operations  
Doc oficial: https://api.clickbank.com/rest/1.3/products

| Método | Ruta | Qué hace |
|---|---|---|
| `GET` | `/rest/1.3/products/{sku}` | Gets a product |
| `PUT` | `/rest/1.3/products/{sku}` | Saves a product with the passed in parameters |
| `DELETE` | `/rest/1.3/products/{sku}` | Delete a product |
| `GET` | `/rest/1.3/products/list` | Lists all products |


### `GET /rest/1.3/products/{sku}`

Gets a product

**Permisos:** api_products_client • HAS_DEVELOPER_KEY

`operationId`: `GetProduct`

| Parámetro | En | Req. | Tipo | Descripción |
|---|---|---|---|---|
| `sku` | path | sí | string |  |
| `site` | query | no | string | The site owning the product to be retrieved. |

**Respuestas:** `200` OK → `Product` · `403` Forbidden → string


### `PUT /rest/1.3/products/{sku}`

Saves a product with the passed in parameters

**Permisos:** api_products_client • HAS_DEVELOPER_KEY

`operationId`: `UpdateProduct`

| Parámetro | En | Req. | Tipo | Descripción |
|---|---|---|---|---|
| `sku` | path | sí | string |  |
| `site` | query | no | string | The site owning the product to be saved. |
| `currency` | query | no | `Currency`: `ARS`, `AUD`, `CAD`, `CHF`, `CLP`, `CNY`, `COP`, `CZK`, `DKK`, `EUR`, `GBP`, `HKD`, `HUF`, `IDR`, `INR`, `JPY`, `KRW`, `MXN`, `MYR`, `NOK`, `NZD`, `PHP`, `PLN`, `RUB`, `SEK`, `SGD`, `THB`, `TRY`, `USD`, `ZAR` | The currency the product is sold in. |
| `price` | query | no | number(double) | The price for the product. Or in the case of RECURRING or RECURRING_PHYSICAL products, the initial price. |
| `language` | query | no | `Language`: `DE`, `EN`, `ES`, `FR`, `IT`, `PT` | The language of the product. Must be either DE (German), EN (English), ES, (Spanish), FR (French), IT (Italian), or PT (Portuguese) |
| `title` | query | no | string | The title of the product |
| `digital` | query | no | boolean | product has digital component |
| `physical` | query | no | boolean | product has physical component |
| `digitalRecurring` | query | no | boolean | product has digital recurring component |
| `physicalRecurring` | query | no | boolean | product has physical recurring component |
| `categories` | query | no | `ProductCategory`: `nil`, `EBOOK`, `SOFTWARE`, `GAMES`, `AUDIO`, `VIDEO`, `MEMBER_SITE` | The categories for digital products. At least one is required for a product with a digital component, multiple may be specified. Must be either EBOOK, SOFTWARE, GAMES, AUDIO, VIDEO, or MEMBER_SITE. Providing a category for a product without a digital component will result in an error. |
| `skipConfirmationPage` | query | no | boolean | Whether or not to skip confirmation page. This parameter is role restricted. If you do not have the role, it will not be honored. |
| `thankYouPage` | query | no | string | The thank you page for desktops. Either thankYouPage or mobileThankYouPage is required |
| `mobileThankYouPage` | query | no | string | The thank you page for mobile devices. |
| `rebillPrice` | query | no | number(double) | In the case of RECURRING or RECURRING_PHYSICAL (required) products the rebill price. |
| `rebillCommission` | query | no | number(double) | In the case of RECURRING or RECURRING_PHYSICAL products the rebill commission. |
| `trialPeriod` | query | no | integer(int32) | In the case of RECURRING or RECURRING_PHYSICAL (required) products the trial period. Must be either 0 or a whole number between 3 and 31. |
| `frequency` | query | no | `RecurringFrequency`: `nil`, `WEEKLY`, `BI_WEEKLY`, `MONTHLY`, `QUARTERLY`, `HALF_YEARLY`, `YEARLY`, `MONTHS`, `WEEKS`, `DAYS` | In the case of RECURRING or RECURRING_PHYSICAL (required) products the rebill frequency. Must be either WEEKLY, BI_WEEKLY, MONTHLY, QUARTERLY, HALF_YEARLY or YEARLY |
| `duration` | query | no | integer(int32) | In the case of RECURRING or RECURRING_PHYSICAL (required) products the rebill duration. |
| `shippingProfile` | query | no | string | In the case of PHYSICAL or RECURRING_PHYSICAL products the name of the shipping profile |
| `purchaseCommission` | query | no | string | The commission rate for the product - if unspecified the sites commission rate will be used. |
| `description` | query | no | string | In the case of PHYSICAL or RECURRING_PHYSICAL (required) the description of the product. |
| `image` | query | no | integer(int32) | The id of the image associated to the product |
| `pitchPage` | query | no | string | The URL where you pitch your product. This might be the same as the HopLink Target URL. Either pitchPage or mobilePitchPage is required. |
| `mobilePitchPage` | query | no | string | The URL where you pitch your product to customers on mobile devices. This might be the same as the HopLink Target URL. Either pitchPage or mobilePitchPage is required. |
| `saleRefundDaysLimit` | query | no | integer(int32) | The number days within which a sale can be refunded |
| `rebillRefundDaysLimit` | query | no | integer(int32) | The number days within which a rebill can be refunded |
| `deliveryMethod` | query | no | string | The method of delivery. |
| `deliverySpeed` | query | no | string | The speed of delivery. |
| `preRebillNotificationOverride` | query | no | boolean | When set, Pre-rebill notificaitons will be sent when the frequency is greater than the required cycle. |
| `preRebillNotificationLeadTime` | query | no | integer(int32) | The number of days before the rebill notification. When enabled, a Pre-rebill notification will be sent to the number equal to the number of days indicated in the lead time and will apply to the rest of the subscription. |

**Respuestas:** `200` OK · `201` Created · `403` Forbidden → string


### `DELETE /rest/1.3/products/{sku}`

Delete a product

**Permisos:** api_products_client • HAS_DEVELOPER_KEY

`operationId`: `DeleteProduct`

| Parámetro | En | Req. | Tipo | Descripción |
|---|---|---|---|---|
| `sku` | path | sí | string |  |
| `site` | query | no | string | The site owning product to be deleted |

**Respuestas:** `204` No Content · `403` Forbidden → string


### `GET /rest/1.3/products/list`

Lists all products

**Permisos:** api_products_client • HAS_DEVELOPER_KEY

`operationId`: `GetProducts`

| Parámetro | En | Req. | Tipo | Descripción |
|---|---|---|---|---|
| `site` | query | no | string | The site owning the products |
| `type` | query | no | `ProductType`: `nil`, `STANDARD`, `RECURRING` | The product types to return.d Must be either STANDARD or RECURRING. Will return all types if not specified |
| `page` | header | no | integer(int32) | Page Number. Results only return 100 records at a time |

**Respuestas:** `200` OK → `ProductList` · `206` Partial Content → `ProductList` · `403` Forbidden → string


## Quickstats

The Quickstats API provides information about your account  
Doc oficial: https://api.clickbank.com/rest/1.3/quickstats

| Método | Ruta | Qué hace |
|---|---|---|
| `GET` | `/rest/1.3/quickstats/count` | The count service sums the quickstat sale, refund and chargeback amounts based on the search criteria. If no s |
| `GET` | `/rest/1.3/quickstats/accounts` | Return a list of all account nicknames which the current api user has read access. |
| `GET` | `/rest/1.3/quickstats/list` | Return the quickstats for the api user, based on the search criteria. If no search conditions are set, it will |


### `GET /rest/1.3/quickstats/count`

The count service sums the quickstat sale, refund and chargeback amounts based on the search criteria. If no search conditions are set, it will return the sum of the values for the last 45 days based on all the accounts linked to the API keys. The count service is similar to the list method except for the fact that it presents the user with one total of the dates specified the search criteria instead of listing each day's quickstat values individually. Note that the quickStatDate in the returned data will be null.

**Permisos:** api_order_read • HAS_DEVELOPER_KEY

`operationId`: `GetQuickstatCount`

| Parámetro | En | Req. | Tipo | Descripción |
|---|---|---|---|---|
| `startDate` | query | no | string(date) | The beginning date for the search (yyyy-mm-dd). Defaults to 45 days from today if not specified. |
| `endDate` | query | no | string(date) | The end date for the search (yyyy-mm-dd). Defaults to today if not specified |
| `account` | query | no | string | The nickName of the account. Defaults to all accounts if not specified. |

**Respuestas:** `200` OK → integer(int32) · `403` Forbidden → string


### `GET /rest/1.3/quickstats/accounts`

Return a list of all account nicknames which the current api user has read access.

**Permisos:** api_order_read • HAS_DEVELOPER_KEY

`operationId`: `GetQuickstatAccounts`

**Respuestas:** `200` OK → `AccountList` · `403` Forbidden → string


### `GET /rest/1.3/quickstats/list`

Return the quickstats for the api user, based on the search criteria. If no search conditions are set, it will return the quickstats for all the accounts for the API user for the last 45 days

**Permisos:** api_order_read • HAS_DEVELOPER_KEY

`operationId`: `GetQuickstats`

| Parámetro | En | Req. | Tipo | Descripción |
|---|---|---|---|---|
| `startDate` | query | no | string(date) | The beginning date for the search (yyyy-mm-dd). Defaults to 45 days from today if not specified. |
| `endDate` | query | no | string(date) | The end date for the search (yyyy-mm-dd). Defaults to today if not specified |
| `account` | query | no | string | The nickName of the account. Defaults to all accounts if not specified. |
| `page` | header | no | integer(int32) | Page Number. Results only return 100 records at a time |

**Respuestas:** `200` OK → `AccountList` · `403` Forbidden → string


## Shipping

The Shipping API provides shipping information for physical good orders by receipt or time parameters. This also contains the Ship Notice API.  
Doc oficial: https://api.clickbank.com/rest/1.3/shipping

| Método | Ruta | Qué hace |
|---|---|---|
| `GET` | `/rest/1.3/shipping/count` | Returns a count of physical goods orders matching the shipping criteria. |
| `GET` | `/rest/1.3/shipping/list` | List physical goods orders matching the shipping criteria. Only the first 100 orders will be returned. This me |
| `POST` | `/rest/1.3/shipping/shipnotice/{receipt}` | Creates a shipping notice for the given transaction. |
| `GET` | `/rest/1.3/shipping/shipnotice/{receipt}` | Returns the ship notices for the given transaction. |


### `GET /rest/1.3/shipping/count`

Returns a count of physical goods orders matching the shipping criteria.

**Permisos:** api_order_read • HAS_DEVELOPER_KEY

`operationId`: `GetShippingCount`

| Parámetro | En | Req. | Tipo | Descripción |
|---|---|---|---|---|
| `status` | query | no | `ShippingStatus`: `nil`, `shipped`, `notshipped`, `all` | Can be 'shipped', 'notshipped' or 'all' - to find related orders. |
| `days` | query | no | integer(int32) | Return orders within the last n days. If start and end date are specified, they will take precedence over this value. If neither days, startDate or endDate is specified, it will default to last 30 days or orders. |
| `startDate` | query | no | string(date) | Instead of using the days parameter, a user can specify a date range (yyyy-mm-dd). This is the start date |
| `endDate` | query | no | string(date) | Instead of using the days parameter, a user can specify a date range (yyyy-mm-dd). This is the endDate |
| `receipt` | query | no | string | Search the physical good order by receipt. If this parameter is specified, the other search parameters will be ignored. |

**Respuestas:** `200` OK → integer(int32) · `403` Forbidden → string


### `GET /rest/1.3/shipping/list`

List physical goods orders matching the shipping criteria. Only the first 100 orders will be returned. This method supports pagination, so if the second page of the next 100 items is required a request header 'Page' with value 2 will return them.

**Permisos:** api_order_read • HAS_DEVELOPER_KEY

`operationId`: `GetShippings`

| Parámetro | En | Req. | Tipo | Descripción |
|---|---|---|---|---|
| `status` | query | no | `ShippingStatus`: `nil`, `shipped`, `notshipped`, `all` | Can be 'shipped', 'notshipped' or 'all' - to find related orders. |
| `days` | query | no | integer(int32) | Return orders within the last n days. If start and end date are specified, they will take precedence over this value. If neither days, startDate or endDate is specified, it will default to last 30 days or orders. |
| `startDate` | query | no | string(date) | Instead of using the days parameter, a user can specify a date range (yyyy-mm-dd). This is the start date |
| `endDate` | query | no | string(date) | Instead of using the days parameter, a user can specify a date range (yyyy-mm-dd). This is the endDate |
| `receipt` | query | no | string | Search the physical good order by receipt. If this parameter is specified, the other search parameters will be ignored. |
| `page` | header | no | integer(int32) | Page Number. Results only return 100 records at a time |

**Respuestas:** `200` OK → `ShippingList` · `206` Partial Content → `ShippingList` · `403` Forbidden → string


### `POST /rest/1.3/shipping/shipnotice/{receipt}`

Creates a shipping notice for the given transaction.

**Permisos:** api_order_read • api_order_write • HAS_DEVELOPER_KEY

`operationId`: `CreateShipNotice`

| Parámetro | En | Req. | Tipo | Descripción |
|---|---|---|---|---|
| `receipt` | path | sí | string |  |
| `date` | query | no | string(date) | The shipping date (yyyy-mm-dd). |
| `carrier` | query | no | string | The shipping carrier. |
| `tracking` | query | no | string | The tracking id. |
| `comments` | query | no | string | The comments associated with the notice. |
| `item` | query | no | string | The sku/itemNo of the line item. This parameter is required if the transaction includes multiple physical items. |

**Respuestas:** `200` OK → `ShippingNoticeData` · `403` Forbidden → string


### `GET /rest/1.3/shipping/shipnotice/{receipt}`

Returns the ship notices for the given transaction.

**Permisos:** api_order_read • HAS_DEVELOPER_KEY

`operationId`: `GetShipNotice`

| Parámetro | En | Req. | Tipo | Descripción |
|---|---|---|---|---|
| `receipt` | path | sí | string |  |

**Respuestas:** `200` OK → `ShippingNoticeList` · `403` Forbidden → string


## Shipping2

The Shipping API provides shipping information for physical good orders by receipt or time parameters. This also contains the Ship Notice API.  
Doc oficial: https://api.clickbank.com/rest/1.3/shipping2

| Método | Ruta | Qué hace |
|---|---|---|
| `GET` | `/rest/1.3/shipping2/count` | Returns a count of physical goods orders matching the shipping criteria. |
| `GET` | `/rest/1.3/shipping2/list` | List physical goods orders matching the shipping criteria. Only the first 100 orders will be returned. This me |
| `POST` | `/rest/1.3/shipping2/shipnotice/{receipt}` | Creates a shipping notice for the given transaction. |
| `GET` | `/rest/1.3/shipping2/shipnotice/{receipt}` | Returns the ship notices for the given transaction. |


### `GET /rest/1.3/shipping2/count`

Returns a count of physical goods orders matching the shipping criteria.

**Permisos:** api_order_read • HAS_DEVELOPER_KEY

`operationId`: `GetShippingCount`

| Parámetro | En | Req. | Tipo | Descripción |
|---|---|---|---|---|
| `status` | query | no | `ShippingStatus`: `nil`, `shipped`, `notshipped`, `all` | Can be 'shipped', 'notshipped' or 'all' - to find related orders. |
| `days` | query | no | integer(int32) | Return orders within the last n days. If start and end date are specified, they will take precedence over this value. If neither days, startDate or endDate is specified, it will default to last 30 days or orders. |
| `startDate` | query | no | string(date) | Instead of using the days parameter, a user can specify a date range (yyyy-mm-dd). This is the start date |
| `endDate` | query | no | string(date) | Instead of using the days parameter, a user can specify a date range (yyyy-mm-dd). This is the endDate |
| `receipt` | query | no | string | Search the physical good order by receipt. If this parameter is specified, the other search parameters will be ignored. |

**Respuestas:** `200` OK → integer(int32) · `403` Forbidden → string


### `GET /rest/1.3/shipping2/list`

List physical goods orders matching the shipping criteria. Only the first 100 orders will be returned. This method supports pagination, so if the second page of the next 100 items is required a request header 'Page' with value 2 will return them.

**Permisos:** api_order_read • HAS_DEVELOPER_KEY

`operationId`: `GetShippings`

| Parámetro | En | Req. | Tipo | Descripción |
|---|---|---|---|---|
| `status` | query | no | `ShippingStatus`: `nil`, `shipped`, `notshipped`, `all` | Can be 'shipped', 'notshipped' or 'all' - to find related orders. |
| `days` | query | no | integer(int32) | Return orders within the last n days. If start and end date are specified, they will take precedence over this value. If neither days, startDate or endDate is specified, it will default to last 30 days or orders. |
| `startDate` | query | no | string(date) | Instead of using the days parameter, a user can specify a date range (yyyy-mm-dd). This is the start date |
| `endDate` | query | no | string(date) | Instead of using the days parameter, a user can specify a date range (yyyy-mm-dd). This is the endDate |
| `receipt` | query | no | string | Search the physical good order by receipt. If this parameter is specified, the other search parameters will be ignored. |
| `page` | header | no | integer(int32) | Page Number. Results only return 100 records at a time |

**Respuestas:** `200` OK → `ShippingList` · `206` Partial Content → `ShippingList` · `403` Forbidden → string


### `POST /rest/1.3/shipping2/shipnotice/{receipt}`

Creates a shipping notice for the given transaction.

**Permisos:** api_order_read • api_order_write • HAS_DEVELOPER_KEY

`operationId`: `CreateShipNotice`

| Parámetro | En | Req. | Tipo | Descripción |
|---|---|---|---|---|
| `receipt` | path | sí | string |  |
| `date` | query | no | string(date) | The shipping date (yyyy-mm-dd). |
| `carrier` | query | no | string | The shipping carrier. |
| `tracking` | query | no | string | The tracking id. |
| `comments` | query | no | string | The comments associated with the notice. |
| `item` | query | no | string | The sku/itemNo of the line item. This parameter is required if the transaction includes multiple physical items. |
| `fillOrder` | query | no | boolean | Indicates that the receipt is part of an order to be shipped altogether, for which the remaining shipping notices should be automatically generated. |

**Respuestas:** `200` OK → `ShippingNoticeData` · `403` Forbidden → string


### `GET /rest/1.3/shipping2/shipnotice/{receipt}`

Returns the ship notices for the given transaction.

**Permisos:** api_order_read • HAS_DEVELOPER_KEY

`operationId`: `GetShipNotice`

| Parámetro | En | Req. | Tipo | Descripción |
|---|---|---|---|---|
| `receipt` | path | sí | string |  |

**Respuestas:** `200` OK → `ShippingNoticeList` · `403` Forbidden → string


## Shipping3

The Shipping API provides shipping information for physical good orders by receipt or time parameters. This also contains the Ship Notice API.  
Doc oficial: https://api.clickbank.com/rest/1.3/shipping3

| Método | Ruta | Qué hace |
|---|---|---|
| `GET` | `/rest/1.3/shipping3/count` | Returns a count of physical goods orders matching the shipping criteria. |
| `GET` | `/rest/1.3/shipping3/list` | List physical goods orders matching the shipping criteria. Only the first 100 orders will be returned. This me |
| `POST` | `/rest/1.3/shipping3/shipnotice/{receipt}` | Creates a shipping notice for the given transaction. |
| `GET` | `/rest/1.3/shipping3/shipnotice/{receipt}` | Returns the ship notices for the given transaction. |


### `GET /rest/1.3/shipping3/count`

Returns a count of physical goods orders matching the shipping criteria.

**Permisos:** api_order_read • HAS_DEVELOPER_KEY

`operationId`: `GetShippingCount`

| Parámetro | En | Req. | Tipo | Descripción |
|---|---|---|---|---|
| `status` | query | no | `ShippingStatus`: `nil`, `shipped`, `notshipped`, `all` | Can be 'shipped', 'notshipped' or 'all' - to find related orders. |
| `days` | query | no | integer(int32) | Return orders within the last n days. If start and end date are specified, they will take precedence over this value. If neither days, startDate or endDate is specified, it will default to last 30 days or orders. |
| `startDate` | query | no | string(date) | Instead of using the days parameter, a user can specify a date range (yyyy-mm-dd). This is the start date |
| `endDate` | query | no | string(date) | Instead of using the days parameter, a user can specify a date range (yyyy-mm-dd). This is the endDate |
| `receipt` | query | no | string | Search the physical good order by receipt. If this parameter is specified, the other search parameters will be ignored. |

**Respuestas:** `200` OK → integer(int32) · `403` Forbidden → string


### `GET /rest/1.3/shipping3/list`

List physical goods orders matching the shipping criteria. Only the first 100 orders will be returned. This method supports pagination, so if the second page of the next 100 items is required a request header 'Page' with value 2 will return them.

**Permisos:** api_order_read • HAS_DEVELOPER_KEY

`operationId`: `GetShippings`

| Parámetro | En | Req. | Tipo | Descripción |
|---|---|---|---|---|
| `status` | query | no | `ShippingStatus`: `nil`, `shipped`, `notshipped`, `all` | Can be 'shipped', 'notshipped' or 'all' - to find related orders. |
| `days` | query | no | integer(int32) | Return orders within the last n days. If start and end date are specified, they will take precedence over this value. If neither days, startDate or endDate is specified, it will default to last 30 days or orders. |
| `startDate` | query | no | string(date) | Instead of using the days parameter, a user can specify a date range (yyyy-mm-dd). This is the start date |
| `endDate` | query | no | string(date) | Instead of using the days parameter, a user can specify a date range (yyyy-mm-dd). This is the endDate |
| `receipt` | query | no | string | Search the physical good order by receipt. If this parameter is specified, the other search parameters will be ignored. |
| `page` | header | no | integer(int32) | Page Number. Results only return 100 records at a time |

**Respuestas:** `200` OK → `ShippingList` · `206` Partial Content → `ShippingList` · `403` Forbidden → string


### `POST /rest/1.3/shipping3/shipnotice/{receipt}`

Creates a shipping notice for the given transaction.

**Permisos:** api_order_read • api_order_write • HAS_DEVELOPER_KEY

`operationId`: `CreateShipNotice`

| Parámetro | En | Req. | Tipo | Descripción |
|---|---|---|---|---|
| `receipt` | path | sí | string |  |
| `date` | query | no | string(date) | The shipping date (yyyy-mm-dd). |
| `carrier` | query | no | string | The shipping carrier. |
| `tracking` | query | no | string | The tracking id. |
| `comments` | query | no | string | The comments associated with the notice. |
| `item` | query | no | string | The sku/itemNo of the line item. This parameter is required if the transaction includes multiple physical items. |
| `fillOrder` | query | no | boolean | Indicates that the receipt is part of an order to be shipped altogether, for which the remaining shipping notices should be automatically generated. |

**Respuestas:** `200` OK → `ShippingNoticeData` · `403` Forbidden → string


### `GET /rest/1.3/shipping3/shipnotice/{receipt}`

Returns the ship notices for the given transaction.

**Permisos:** api_order_read • HAS_DEVELOPER_KEY

`operationId`: `GetShipNotice`

| Parámetro | En | Req. | Tipo | Descripción |
|---|---|---|---|---|
| `receipt` | path | sí | string |  |

**Respuestas:** `200` OK → `ShippingNoticeList` · `403` Forbidden → string


## Tickets

The Tickets API lets you create a technical support or refund ticket, and view or update the status of an existing ticket. For refund tickets related to physical products, you can also confirm that you’ve received a returned product  
Doc oficial: https://api.clickbank.com/rest/1.3/tickets

| Método | Ruta | Qué hace |
|---|---|---|
| `POST` | `/rest/1.3/tickets/{receipt}` | Create a ticket with the passed in parameters. Will return the created ticket if it's successful. |
| `GET` | `/rest/1.3/tickets/{id}` | Find a ticket by its ID. Will return the ticket with the given ID back. If the ticket does not exist, or the u |
| `PUT` | `/rest/1.3/tickets/{id}` | Allows the user to close a ticket, comment on a ticket, change type of a ticket, or reopen the ticket. Will re |
| `GET` | `/rest/1.3/tickets/count` | Counts the tickets matching the search criteria. |
| `GET` | `/rest/1.3/tickets/list` | Searches for tickets matching the search criteria. Will return a list of ticket data objects with a status cod |
| `GET` | `/rest/1.3/tickets/refundAmounts/{receipt}` | Returns amounts that would be refunded for a given refund type & value. |
| `POST` | `/rest/1.3/tickets/{id}/returned` | Acknowledges return of physical item from customer, allowing refund of transaction to complete. This call will |


### `POST /rest/1.3/tickets/{receipt}`

Create a ticket with the passed in parameters. Will return the created ticket if it's successful.

**Permisos:** api_order_write • HAS_DEVELOPER_KEY

`operationId`: `CreateTicket`

| Parámetro | En | Req. | Tipo | Descripción |
|---|---|---|---|---|
| `receipt` | path | sí | string |  |
| `type` | query | no | `TicketTypeRequest`: `rfnd`, `cncl`, `tech` | The type of the ticket. Must be either 'rfnd', 'cncl' or 'tech'. For 'rfnd' the parameter refundType must also be specified. If the receipt is for a non-recurring product, either 'rfnd' or 'cncl' will automatically refund that sale. For any receipt of a recurring product, a 'rfnd' will refund that receipt AND cancel any future billing, while a 'cncl' will only cancel future billing without issuing any refunds. |
| `reason` | query | no | `TicketReasonRequest`: `ticket.type.cancel.1`, `ticket.type.cancel.2`, `ticket.type.cancel.3`, `ticket.type.cancel.4`, `ticket.type.cancel.5`, `ticket.type.cancel.6`, `ticket.type.cancel.7`, `ticket.type.cancel.not.mobile`, `ticket.type.refund.1`, `ticket.type.refund.2`, `ticket.type.refund.3`, `ticket.type.refund.4`, `ticket.type.refund.5`, `ticket.type.refund.6`, `ticket.type.refund.7`, `ticket.type.refund.8`, `ticket.type.refund.returned`, `ticket.type.refund.not.mobile`, `ticket.type.tech_support.1`, `ticket.type.tech_support.2`, `ticket.type.tech_support.3`, `ticket.type.tech_support.4`, `ticket.type.tech_support.9`, `ticket.type.tech_support.10` | The reason associated with the ticket. A ticket reason should be one of the following based on type: CNCLticket.type.cancel.1 (I did not receive additional value for the recurring payments).ticket.type.cancel.2 (I was not satisfied with the subscription / Subscription did not meet expectations) ticket.type.cancel.3 (I was unable to get support from the vendor) ticket.type.cancel.4 (Product was not compatible with my computer) ticket.type.cancel.5 (I am unable to afford continuing payments for this subscription) ticket.type.cancel.6 (I did not realize that I accepted the terms for continuing payments) ticket.type.cancel.7 (Other) ticket.type.cancel.not.mobile (Product was not compatible with my mobile device.) RFNDticket.type.refund.1 (I never received my product) ticket.type.refund.2 (I was not satisfied with the product. / Product did not meet expectations) ticket.type.refund.3 (Product was not compatible with my computer) ticket.type.refund.4 (I was unable to get technical support) ticket.type.refund.5 (I did not authorize the purchase) ticket.type.refund.6 (I do not recognize the purchase) ticket.type.refund.7 (Duplicate purchase. / Or already purchased product previously) ticket.type.refund.returned (Product returned) ticket.type.refund.8 (Other) ticket.type.refund.not.mobile (Product was not compatible with my mobile device.) TECHticket.type.tech_support.1 (I am unable to log in.) ticket.type.tech_support.2 (I had problems downloading the product.) ticket.type.tech_support.3 (I never received a valid registration code, please send a valid code.) ticket.type.tech_support.4 (I can't get the product to work.) ticket.type.tech_support.9 (Other)ticket.type.tech_support.10 (I never received my product.) |
| `sku` | query | no | string | sku/itemNo of the line item. Used to identify individual purchase in multi-item cart purchase |
| `comment` | query | no | string | The comments associated with creating a ticket. |
| `refundType` | query | no | `RefundType`: `nil`, `FULL`, `PARTIAL_PERCENT`, `PARTIAL_AMOUNT`, `PARTIAL_QUANTITY`, `TAX` | The type of refund. Supported values include 'FULL', 'PARTIAL_PERCENT', 'PARTIAL_AMOUNT' (case sensitive). For 'PARTIAL_PERCENT' and 'PARTIAL_AMOUNT' the parameter refundAmount must be specified. Additionally the vendor associated with the transaction must be enabled for partial refunds in order to use both 'PARTIAL_PERCENT' and 'PARTIAL_AMOUNT', if vendor is not enabled and one of the partial options is specified a 403 will be returned. |
| `refundAmount` | query | no | number(double) | Specified for partial refunds indicating the amount of the transaction to be refunded. For 'PARTIAL_PERCENT' this must be a number between 1 and 80, with no more than two digits of precision - for example 50.00. For 'PARTIAL_AMOUNT' this is the amount to refund in the currency the customer used during the purchase. The resource /1.3/tickets/refundAmounts may be used to retrieve what amounts in the customers currency convert to. |
| `retainSubscription` | query | no | boolean | Specifies if the subscription should be retained after the refund has been processed |

**Respuestas:** `200` OK → `TicketData` · `403` Forbidden → string


### `GET /rest/1.3/tickets/{id}`

Find a ticket by its ID. Will return the ticket with the given ID back. If the ticket does not exist, or the user is not authorized to view the ticket - a status code of 403 will be returned.

**Permisos:** api_order_read • HAS_DEVELOPER_KEY

`operationId`: `GetTicket`

| Parámetro | En | Req. | Tipo | Descripción |
|---|---|---|---|---|
| `id` | path | sí | integer(int32) |  |

**Respuestas:** `200` OK → `TicketData` · `403` Forbidden → string


### `PUT /rest/1.3/tickets/{id}`

Allows the user to close a ticket, comment on a ticket, change type of a ticket, or reopen the ticket. Will return a status code 200 if the action is successful, a 403 if user is not allowed to act on the ticket or the ticket does not exist. Upon success, this will return the ticket data. Please note that closing of a ticket manually means that the ticket is cancelled. So for example closing of an open refund ticket will cancel the refund request. If the action is not specified, the assumption is that the user is trying to comment on the ticket. Also note that reopening is only supported for closed tickets and will return a 400 status code otherwise.

**Permisos:** api_order_read • api_order_write • HAS_DEVELOPER_KEY

`operationId`: `UpdateTicket`

| Parámetro | En | Req. | Tipo | Descripción |
|---|---|---|---|---|
| `id` | path | sí | integer(int32) |  |
| `action` | query | no | `TicketAction`: `nil`, `change`, `close`, `reopen` | The action to be taken. Supported actions are 'change', 'close' and 'reopen'. |
| `comment` | query | no | string | The comments that go along with the action, or comments on the ticket. Comments are required when reopening a ticket. |
| `type` | query | no | `TicketTypeRequest`: `rfnd`, `cncl`, `tech` | If changing the type of the ticket, this will be one of rfnd, cncl, or tech. Note: Partial refunds are not allowed when changing to a rfnd ticket type. Tickets changed to rfnd will be full refunds. |

**Respuestas:** `200` OK → `ShippingNoticeList` · `204` No Content · `403` Forbidden → string


### `GET /rest/1.3/tickets/count`

Counts the tickets matching the search criteria.

**Permisos:** api_order_read • HAS_DEVELOPER_KEY

`operationId`: `GetTicketCount`

| Parámetro | En | Req. | Tipo | Descripción |
|---|---|---|---|---|
| `type` | query | no | `TicketTypeRequest`: `rfnd`, `cncl`, `tech` | The type of the ticket. Must be either 'rfnd' / 'cncl' or 'tech' |
| `status` | query | no | string | The status of the ticket. Can be 'open', 'reopened' or 'closed' |
| `receipt` | query | no | string | Counts a ticket by a given receipt. Will return the ticket(s) associated with the transaction. If the receipt is a subscription, all tickets with associated with each rebill of that subscription will be counted. |

**Respuestas:** `200` OK → integer(int32) · `403` Forbidden → string


### `GET /rest/1.3/tickets/list`

Searches for tickets matching the search criteria. Will return a list of ticket data objects with a status code of 200. If more than 100 results are returned, it will return a status code of 206 [Partial Content]. Users can then use the 'Page' header to determine the page needed.

**Permisos:** api_order_read • HAS_DEVELOPER_KEY

`operationId`: `GetTickets`

| Parámetro | En | Req. | Tipo | Descripción |
|---|---|---|---|---|
| `type` | query | no | `TicketTypeRequest`: `rfnd`, `cncl`, `tech` | The type of the ticket. Must be either 'rfnd' / 'cncl' or 'tech' |
| `status` | query | no | string | The status of the ticket. Can be 'open', 'reopened' or 'closed' |
| `receipt` | query | no | string | Find a ticket by a given receipt. Will return the ticket(s) associated with the transaction. If the receipt is a subscription, all tickets with associated with each rebill of that subscription will be returned. Must be 4 or more characters in length, not counting the wildcard character ('%'). May not start with the wildcard character. |
| `createDateFrom` | query | no | string(date) | The start of the createDate range to filter tickets by. If you provide a 'createDateFrom', you must also provide a 'createDateTo' to complete the date range. The range cannot be more than 7 days in length. Dates must be in the format 'yyyy-mm-dd', i.e '2011-12-31' for December 31st, 2011. |
| `createDateTo` | query | no | string(date) | The end of the createDate range to filter tickets by. If you provide a 'createDateTo', you must also provide a 'createDateFrom' to complete the date range. The range cannot be more than 7 days in length. Dates must be in the format 'yyyy-mm-dd', i.e '2011-12-31' for December 31st, 2011. |
| `updateDateFrom` | query | no | string(date) | The start of the updateDate range to filter tickets by. If you provide a 'updateDateFrom', you must also provide a 'updateDateTo' to complete the date range. The range cannot be more than 7 days in length. Dates must be in the format 'yyyy-mm-dd', i.e '2011-12-31' for December 31st, 2011. |
| `updateDateTo` | query | no | string(date) | The end of the updateDate range to filter tickets by. If you provide a 'updateDateTo', you must also provide a 'updateDateFrom' to complete the date range. The range cannot be more than 7 days in length. Dates must be in the format 'yyyy-mm-dd', i.e '2011-12-31' for December 31st, 2011. |
| `closeDateFrom` | query | no | string(date) | The start of the closeDate range to filter tickets by. If you provide a 'closeDateFrom', you must also provide a 'closeDateTo' to complete the date range. The range cannot be more than 7 days in length. Dates must be in the format 'yyyy-mm-dd', i.e '2011-12-31' for December 31st, 2011. |
| `closeDateTo` | query | no | string(date) | The end of the closeDate range to filter tickets by. If you provide a 'closeDateTo', you must also provide a 'closeDateFrom' to complete the date range. The range cannot be more than 7 days in length. Dates must be in the format 'yyyy-mm-dd', i.e '2011-12-31' for December 31st, 2011. |
| `page` | header | no | integer(int32) | Page Number. Results only return 100 records at a time |

**Respuestas:** `200` OK → `TicketList` · `206` Partial Content → `TicketList` · `403` Forbidden → string


### `GET /rest/1.3/tickets/refundAmounts/{receipt}`

Returns amounts that would be refunded for a given refund type & value.

**Permisos:** api_order_read

`operationId`: `GetTicketRefundAmounts`

| Parámetro | En | Req. | Tipo | Descripción |
|---|---|---|---|---|
| `receipt` | path | sí | string |  |
| `refundType` | query | no | `RefundType`: `nil`, `FULL`, `PARTIAL_PERCENT`, `PARTIAL_AMOUNT`, `PARTIAL_QUANTITY`, `TAX` | The type of refund. Supported values include 'FULL', 'PARTIAL_PERCENT', 'PARTIAL_AMOUNT' (case sensitive). For 'PARTIAL_PERCENT' and 'PARTIAL_AMOUNT' the parameter refundAmount must be specified. Additionally the vendor associated with the transaction must be enabled for partial refunds in order to use both 'PARTIAL_PERCENT' and 'PARTIAL_AMOUNT', if vendor is not enabled and one of the partial options is specified a 403 will be returned. |
| `refundAmount` | query | no | number(double) | Specified for partial refunds indicating the amount of the transaction to be refunded. For 'PARTIAL_PERCENT' this must be a number between 1 and 80, with no more than two digits of precision - for example 50.00. For 'PARTIAL_AMOUNT' this is the amount to refund in the currency the customer used during the purchase. |
| `sku` | query | no | string | line item sku/itemNo |

**Respuestas:** `200` OK → `PartialRefundData` · `403` Forbidden → string


### `POST /rest/1.3/tickets/{id}/returned`

Acknowledges return of physical item from customer, allowing refund of transaction to complete. This call will return a status code of 204 if successful. The body of the response will be empty in this case. A 403 (Forbidden) status code will be return if access is denied. A 400 (Bad Request) will be returned if the ticket isn't found or the ticket is not for a physical purchase.

**Permisos:** api_order_read • api_order_write • HAS_DEVELOPER_KEY

`operationId`: `ReturnedTicket`

| Parámetro | En | Req. | Tipo | Descripción |
|---|---|---|---|---|
| `id` | path | sí | integer(int32) |  |

**Respuestas:** `200` OK → `ShippingNoticeList` · `204` No Content · `403` Forbidden → string
