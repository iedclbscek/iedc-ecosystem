/**
 * @openapi
 * components:
 *   schemas:
 *     ClubPageDraft:
 *       type: object
 *       required: [card, hero, containers]
 *       description: A maximum 1 MB page with 40 containers, 100 widgets, and 100 KB per custom-code widget. Standard text is rendered as safe plain text. Custom code executes only in an opaque sandbox.
 *       properties:
 *         card:
 *           type: object
 *           required: [title]
 *           properties:
 *             title: { type: string, maxLength: 200 }
 *             summary: { type: string, maxLength: 5000 }
 *             cover: { type: string }
 *         hero:
 *           type: object
 *           properties:
 *             title: { type: string, maxLength: 200 }
 *             subtitle: { type: string, maxLength: 5000 }
 *             image: { type: string }
 *         containers:
 *           type: array
 *           maxItems: 40
 *           items:
 *             type: object
 *             required: [id, title, hidden, columns, widgets]
 *             properties:
 *               id: { type: string, maxLength: 100 }
 *               title: { type: string, maxLength: 200 }
 *               hidden: { type: boolean }
 *               columns: { type: integer, enum: [1, 2, 3] }
 *               widgets:
 *                 type: array
 *                 maxItems: 100
 *                 items:
 *                   type: object
 *                   required: [id, type, settings]
 *                   properties:
 *                     id: { type: string, maxLength: 100 }
 *                     type: { type: string, enum: [text, image, gallery, links, stats, list, people, contact, events, embed, custom] }
 *                     settings:
 *                       type: object
 *                       description: Type-specific fields. Custom uses title/html/css/javascript/height (100-1600). Images require src/alt. Embeds accept YouTube or Vimeo video URLs. Events show published public events for the owning club.
 */
/**
 * @openapi
 * /api/admin/clubs/{clubId}/page:
 *   get:
 *     tags: [Club Nexus]
 *     summary: Review a saved draft and publication
 *     security: [{ cookieAuth: [] }, { bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: clubId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Successful response; administrative reads and writes return a page object with revision, draft and published snapshots. Public responses never include drafts or account details. }
 *       400: { description: Invalid ID, revision or content; message identifies the field. }
 *       401: { description: Sign in required. }
 *       403: { description: Club-specific capability or administrator access required. }
 *       404: { description: Page absent or withdrawn; public detail includes legacy or withdrawn flag. }
 *       409: { description: Stale revision or public URL already assigned; reload the saved version before retrying. }
 */
/**
 * @openapi
 * /api/admin/clubs/{clubId}/page/draft:
 *   put:
 *     tags: [Club Nexus]
 *     summary: Save a draft with optimistic concurrency
 *     security: [{ cookieAuth: [] }, { bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: clubId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             additionalProperties: false
 *             required: [expectedRevision, draft]
 *             properties:
 *               expectedRevision: { type: integer, minimum: 0 }
 *               draft: { $ref: "#/components/schemas/ClubPageDraft" }
 *     responses:
 *       200: { description: Successful response; administrative reads and writes return a page object with revision, draft and published snapshots. Public responses never include drafts or account details. }
 *       400: { description: Invalid ID, revision or content; message identifies the field. }
 *       401: { description: Sign in required. }
 *       403: { description: Club-specific capability or administrator access required. }
 *       404: { description: Page absent or withdrawn; public detail includes legacy or withdrawn flag. }
 *       409: { description: Stale revision or public URL already assigned; reload the saved version before retrying. }
 */
/**
 * @openapi
 * /api/admin/clubs/{clubId}/page/publish:
 *   post:
 *     tags: [Club Nexus]
 *     summary: Publish the persisted saved draft
 *     security: [{ cookieAuth: [] }, { bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: clubId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             additionalProperties: false
 *             required: [expectedRevision]
 *             properties:
 *               expectedRevision: { type: integer, minimum: 0 }
 *     responses:
 *       200: { description: Successful response; administrative reads and writes return a page object with revision, draft and published snapshots. Public responses never include drafts or account details. }
 *       400: { description: Invalid ID, revision or content; message identifies the field. }
 *       401: { description: Sign in required. }
 *       403: { description: Club-specific capability or administrator access required. }
 *       404: { description: Page absent or withdrawn; public detail includes legacy or withdrawn flag. }
 *       409: { description: Stale revision or public URL already assigned; reload the saved version before retrying. }
 */
/**
 * @openapi
 * /api/admin/clubs/{clubId}/page/unpublish:
 *   post:
 *     tags: [Club Nexus]
 *     summary: Withdraw a page and its directory card
 *     security: [{ cookieAuth: [] }, { bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: clubId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             additionalProperties: false
 *             required: [expectedRevision]
 *             properties:
 *               expectedRevision: { type: integer, minimum: 0 }
 *     responses:
 *       200: { description: Successful response; administrative reads and writes return a page object with revision, draft and published snapshots. Public responses never include drafts or account details. }
 *       400: { description: Invalid ID, revision or content; message identifies the field. }
 *       401: { description: Sign in required. }
 *       403: { description: Club-specific capability or administrator access required. }
 *       404: { description: Page absent or withdrawn; public detail includes legacy or withdrawn flag. }
 *       409: { description: Stale revision or public URL already assigned; reload the saved version before retrying. }
 */
/**
 * @openapi
 * /api/admin/clubs/{clubId}/public-binding:
 *   patch:
 *     tags: [Club Nexus]
 *     summary: Connect or correct a club public URL (superadmin)
 *     description: Changing an existing connection requires expectedRevision. The previous draft and publication are privately archived, the old slug is released, and the target content is saved as an unpublished draft. A slug assigned to another club cannot be taken.
 *     security: [{ cookieAuth: [] }, { bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: clubId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [slug]
 *             properties:
 *               slug: { type: string, maxLength: 80, example: gdg }
 *               expectedRevision: { type: integer, minimum: 0, description: Required when changing an existing connection. }
 *               draft: { $ref: "#/components/schemas/ClubPageDraft" }
 *     responses:
 *       200: { description: Successful response; administrative reads and writes return a page object with revision, draft and published snapshots. Public responses never include drafts or account details. }
 *       400: { description: Invalid ID, revision or content; message identifies the field. }
 *       401: { description: Sign in required. }
 *       403: { description: Club-specific capability or administrator access required. }
 *       404: { description: Page absent or withdrawn; public detail includes legacy or withdrawn flag. }
 *       409: { description: Stale revision or public URL already assigned; reload the saved version before retrying. }
 */
/**
 * @openapi
 * /api/admin/nexus/order:
 *   get:
 *     tags: [Club Nexus]
 *     summary: Read the administrator directory order
 *     security: [{ cookieAuth: [] }, { bearerAuth: [] }]
 *     responses:
 *       200: { description: Successful response; administrative reads and writes return a page object with revision, draft and published snapshots. Public responses never include drafts or account details. }
 *       400: { description: Invalid ID, revision or content; message identifies the field. }
 *       401: { description: Sign in required. }
 *       403: { description: Club-specific capability or administrator access required. }
 *       404: { description: Page absent or withdrawn; public detail includes legacy or withdrawn flag. }
 *       409: { description: Stale revision or public URL already assigned; reload the saved version before retrying. }
 */
/**
 * @openapi
 * /api/admin/nexus/order:
 *   put:
 *     tags: [Club Nexus]
 *     summary: Save the administrator directory order
 *     security: [{ cookieAuth: [] }, { bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [order]
 *             properties:
 *               order: { type: array, uniqueItems: true, items: { type: string }, example: [gdg, tinkerhub] }
 *     responses:
 *       200: { description: Successful response; administrative reads and writes return a page object with revision, draft and published snapshots. Public responses never include drafts or account details. }
 *       400: { description: Invalid ID, revision or content; message identifies the field. }
 *       401: { description: Sign in required. }
 *       403: { description: Club-specific capability or administrator access required. }
 *       404: { description: Page absent or withdrawn; public detail includes legacy or withdrawn flag. }
 *       409: { description: Stale revision or public URL already assigned; reload the saved version before retrying. }
 */
/**
 * @openapi
 * /api/public/nexus:
 *   get:
 *     tags: [Club Nexus]
 *     summary: List published cards, withdrawn slugs and directory order
 *     responses:
 *       200: { description: Successful response; administrative reads and writes return a page object with revision, draft and published snapshots. Public responses never include drafts or account details. }
 *       400: { description: Invalid ID, revision or content; message identifies the field. }
 *       401: { description: Sign in required. }
 *       403: { description: Club-specific capability or administrator access required. }
 *       404: { description: Page absent or withdrawn; public detail includes legacy or withdrawn flag. }
 *       409: { description: Stale revision or public URL already assigned; reload the saved version before retrying. }
 */
/**
 * @openapi
 * /api/public/nexus/{slug}:
 *   get:
 *     tags: [Club Nexus]
 *     summary: Read a published page snapshot only
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Successful response; administrative reads and writes return a page object with revision, draft and published snapshots. Public responses never include drafts or account details. }
 *       400: { description: Invalid ID, revision or content; message identifies the field. }
 *       401: { description: Sign in required. }
 *       403: { description: Club-specific capability or administrator access required. }
 *       404: { description: Page absent or withdrawn; public detail includes legacy or withdrawn flag. }
 *       409: { description: Stale revision or public URL already assigned; reload the saved version before retrying. }
 */
