import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { SubstanceCardBaseFilteredList } from '@gsrs-core/substance-details';
import { GoogleAnalyticsService } from '@gsrs-core/google-analytics';
import { ClinicalTrialService } from '../../../clinical-trials/clinical-trial/clinical-trial.service';
import { SubstanceDetailsBaseTableDisplay } from '../../substance-products/substance-details-base-table-display';
import { PageEvent } from '@angular/material/paginator';
import { FacetParam } from '@gsrs-core/facets-manager';
import { Sort } from '@angular/material/sort';
import { ActivatedRoute, Router, NavigationExtras } from '@angular/router';
import { Subscription, Observable, Subject } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { AuthService } from '@gsrs-core/auth';
import { LoadingService } from '@gsrs-core/loading/loading.service';
import { ConfigService, LoadedComponents } from '@gsrs-core/config';
import { ExportDialogComponent } from '@gsrs-core/substances-browse/export-dialog/export-dialog.component';
import { take } from 'rxjs/operators';
import { clinicalTrialSearchSortValues } from '../../../clinical-trials/clinical-trial-search-sort-values';

@Component({
  selector: 'app-substance-clinical-trials',
  templateUrl: './substance-clinical-trials.component.html',
  styleUrls: ['./substance-clinical-trials.component.scss']
})

export class SubstanceClinicalTrialsComponent extends SubstanceDetailsBaseTableDisplay implements OnInit {

  private privateFacetParams: FacetParam;
  clinicalTrialCount = 0;
  showSpinner = false;
  private subscriptions: Array<Subscription> = [];

  privateExport = false;
  disableExport = false;
  etag = '';
  etagAllExport = '';
  loadedComponents: LoadedComponents;
  loadingStatus = '';
  public sortValues = clinicalTrialSearchSortValues;
  order = '$root_trialNumber';
  ascDescDir = 'desc';

  @Input() substanceUuid: string;
  @Output() countClinicalTrialOut: EventEmitter<number> = new EventEmitter<number>();

  displayedColumns: string[] = [
    'edit',
    'trialNumber',
    'title',
    'sponsor',
    'conditions',
    'outcomemeasures'
  ];

  constructor(
    public gaService: GoogleAnalyticsService,
    private clinicalTrialService: ClinicalTrialService,
    private configService: ConfigService,
    public authService: AuthService,
    private loadingService: LoadingService,
    private router: Router,
    private dialog: MatDialog
  ) {
    super(gaService, clinicalTrialService);
  }

  ngOnInit() {
    this.loadedComponents = this.configService.configData.loadedComponents || null;
    this.authService.hasAnyRolesAsync('Admin', 'Updater', 'SuperUpdater').pipe(take(1)).subscribe(response => {
      this.isAdmin = response;
    });
    if (this.substanceUuid) {
     this.getSubstanceClinicalTrials(null, 'initial');
    }
  }

  ngOnDestroy() {
    this.subscriptions.forEach(subscription => {
      subscription.unsubscribe();
    });
  }

  getSubstanceClinicalTrials(pageEvent?: PageEvent, searchType?: string): void {
    this.setPageEvent(pageEvent);
    const skip = this.page * this.pageSize;
    this.showSpinner = true;  // Start progress spinner
    const subscriptionClinical = this.clinicalTrialService.getClinicalTrials({
      searchTerm: this.substanceUuid,
      cutoff: null,
      type: "substanceKey",
      order: this.order,
      pageSize: this.pageSize,
      facets: this.privateFacetParams,
      skip: skip
    })
      .subscribe(pagingResponse => {
        if (searchType && searchType === 'initial') {
          this.etagAllExport = pagingResponse.etag;
        }
        // AW removed else clause so this runs every time.
        // This makes it work, but AW might need to understand the
        // intention better.
        // else {
        this.clinicalTrialService.totalRecords = pagingResponse.total;
        this.setResultData(pagingResponse.content);
        this.clinicalTrialCount = pagingResponse.total;
        this.etag = pagingResponse.etag;
        // }

        this.countClinicalTrialOut.emit(this.clinicalTrialCount);
        this.showSpinner = false;  // Stop progress spinner
      });

    /*
        this.searchControl.valueChanges.subscribe(value => {
          this.filterList(value, this.clinicaltrials, this.analyticsEventCategory);
        }, error => {
          console.log(error);
        });
        this.countUpdate.emit(clinicaltrials.length);
      });
      */
     this.subscriptions.push(subscriptionClinical);
  }


  export() {
    if (this.etagAllExport) {
      const extension = 'ctus.xlsx';
      const url = this.getApiExportUrl(this.etagAllExport, extension);
      if (this.authService.getUser() !== '') {
        const dialogReference = this.dialog.open(ExportDialogComponent, {
         // height: '215x',
          width: '700px',
          data: { 'extension': extension, 'type': 'substanceClinicalTrialUS', 'entity': 'clinicaltrialsus', 'hideOptionButtons': true }
        });
        // this.overlayContainer.style.zIndex = '1002';
        dialogReference.afterClosed().subscribe(response => {
          // this.overlayContainer.style.zIndex = null;
          const name = response.name;
          const id = response.id;
          if (name && name !== '') {
            this.loadingService.setLoading(true);
            const fullname = name + '.' + extension;
            this.authService.startUserDownload(url, this.privateExport, fullname, id).subscribe(response => {
           // this.authService.startUserDownload(url, this.privateExport, fullname).subscribe(response => {
              this.loadingService.setLoading(false);
              const navigationExtras: NavigationExtras = {
                queryParams: {
                  totalSub: this.clinicalTrialCount
                }
              };
              const params = { 'total': this.clinicalTrialCount };
              this.router.navigate(['/user-downloads/', response.id]);
            }, error => this.loadingService.setLoading(false));
          }
        });
      }
    }
  }

  getApiExportUrl(etag: string, extension: string): string {
    return this.clinicalTrialService.getApiExportUrl(etag, extension);
  }



  clinicalTrialListExportUrl() {
    if (this.substanceUuid != null) {
      this.exportUrl = this.clinicalTrialService.getClinicalTrialListExportUrl(this.substanceUuid);
    }
  }

  sortData(sort: Sort) {
    if (sort.active) {
      const orderIndex = this.displayedColumns.indexOf(sort.active).toString(); // + 2; // Adding 2, for name and bdnum.
      this.ascDescDir = sort.direction;
      this.sortValues.forEach(sortValue => {
        if (sortValue.displayedColumns && sortValue.direction) {
          if (this.displayedColumns[orderIndex] === sortValue.displayedColumns && this.ascDescDir === sortValue.direction) {
            this.order = sortValue.value;
          }
        }
      });
      this.getSubstanceClinicalTrials();
    }
    return;
  }

  /*
  // copied from products but has no effect. Make approaoch uniform in future.
  tabSelected($event) {
    if ($event) {
      console.log("EVENT");
      const evt: any = $event.tab;
      const textLabel: string = evt.textLabel;
      if (textLabel != null) {
        this.loadingStatus = 'Loading data...';
        this.paged = [];
        this.getSubstanceClinicalTrials();
      }

    }
  }
*/

}
