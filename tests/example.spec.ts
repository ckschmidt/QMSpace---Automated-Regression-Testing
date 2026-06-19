// Recorded scratch tests have been refactored into Page Object Models.
// This file is kept as a manifest pointing at the refactored homes:
//
//   - pages/LoginPage.ts                tests/login.spec.ts
//   - pages/ProductsPage.ts             tests/intended-product.spec.ts
//     (covers basic create, batch create, and create-then-delete flows;
//      delete is row-level on the Products listing)
//   - pages/IntendedProductForm.ts
//   - pages/ProductNavigationMenu.ts    tests/productnav.spec.ts
//   - pages/ProductDeliverablesPage.ts
//   - pages/DeliverableFilterDialog.ts  tests/deliverable-filter.spec.ts
//     (covers skipping the filter pop-up that appears the first time a
//      deliverable is opened; add apply-filter affordances to the POM
//      and a sibling test when an apply-filter spec is written)
//   - pages/DeliverableWorksheetPage.ts tests/intended-use-workitem.spec.ts
//   - pages/WorkitemDetailsPage.ts
//   - pages/SortWorkitemsDialog.ts
//     (covers the full Intended Use(s) Statement workitem lifecycle on
//      the worksheet — create/edit/delete a workitem, attribute CRUD via
//      the inline cell editor, name + attribute edits via the details
//      view, every sort criterion exposed by the Sort Workitems dialog,
//      and manual drag-drop reordering. Subsumes the earlier
//      add-empty-row and enter-workitem smoke tests.)
//
// Add new specs to /tests and new page objects to /pages following the
// patterns established in those files; do not extend this file.
