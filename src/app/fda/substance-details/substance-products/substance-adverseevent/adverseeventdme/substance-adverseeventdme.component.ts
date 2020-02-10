import { Component, OnInit, Input } from '@angular/core';
import { SubstanceCardBaseFilteredList } from '@gsrs-core/substance-details';
import { GoogleAnalyticsService } from '@gsrs-core/google-analytics';
import { AdverseEventService } from '../../../../adverseevent/service/adverseevent.service';
import { SubstanceDetailsBaseTableDisplay } from '../../../substance-products/substance-details-base-table-display';
import { PageEvent } from '@angular/material/paginator';

@Component({
  selector: 'app-substance-adverseeventdme',
  templateUrl: './substance-adverseeventdme.component.html',
  styleUrls: ['./substance-adverseeventdme.component.scss']
})

export class SubstanceAdverseEventDmeComponent extends SubstanceDetailsBaseTableDisplay implements OnInit {

  displayedColumns: string[] = [
    'dmeReactions', 'ptTermMeddra', 'caseCount', 'dmeCount', 'dmeCountPercent', 'weightedAvgPrr'
  ];

  constructor(
    public gaService: GoogleAnalyticsService,
    private adverseEventService: AdverseEventService
  ) {
    super(gaService, adverseEventService);
  }

  ngOnInit() {
    if (this.bdnum) {
      this.getSubstanceAdverseEventDme();
    }
  }

  getSubstanceAdverseEventDme(pageEvent?: PageEvent): void {
    this.setPageEvent(pageEvent);

    this.adverseEventService.getSubstanceAdverseEventDme(this.bdnum, this.page, this.pageSize).subscribe(results => {
      this.setResultData(results);
    });
      /*
      this.searchControl.valueChanges.subscribe(value => {
        this.filterList(value, this.adverseevents, this.analyticsEventCategory);
      }, error => {
        console.log(error);
      });
      this.countUpdate.emit(adverseevents.length);
    });
    */
  }

}