import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { Subscription } from 'rxjs';
import { SubstanceFormService } from '@gsrs-core/substance-form/substance-form.service';
import { SubstanceDetail } from '@gsrs-core/substance/substance.model';
import { SubstanceRelated, SubstanceSummary } from '@gsrs-core/substance';
import { SpecifiedSubstanceG4mStartingMaterial } from '@gsrs-core/substance/substance.model';

@Component({
  selector: 'app-ssg4m-starting-materials-form',
  templateUrl: './ssg4m-starting-materials-form.component.html',
  styleUrls: ['./ssg4m-starting-materials-form.component.scss']
})
export class Ssg4mStartingMaterialsFormComponent implements OnInit, OnDestroy {

  @Input() startingMaterialIndex: number;
  privateProcessIndex: number;
  privateSiteIndex: number;
  privateStageIndex: number;
  privateStartingMaterial: SpecifiedSubstanceG4mStartingMaterial;
  relatedSubstanceUuid: string;
  substance: SubstanceDetail;
  subscriptions: Array<Subscription> = [];

  constructor(
    private substanceFormService: SubstanceFormService) { }

  @Input()
  set startingMaterial(startingMaterial: SpecifiedSubstanceG4mStartingMaterial) {
    this.privateStartingMaterial = startingMaterial;
  }

  get startingMaterial(): SpecifiedSubstanceG4mStartingMaterial {
    return this.privateStartingMaterial;
  }

  @Input()
  set processIndex(processIndex: number) {
    this.privateProcessIndex = processIndex;
  }

  get processIndex(): number {
    return this.privateProcessIndex;
  }

  @Input()
  set siteIndex(siteIndex: number) {
    this.privateSiteIndex = siteIndex;
  }

  get siteIndex(): number {
    return this.privateSiteIndex;
  }

  @Input()
  set stageIndex(stageIndex: number) {
    this.privateStageIndex = stageIndex;
  }

  get stageIndex(): number {
    return this.privateStageIndex;
  }

  ngOnInit(): void {
    const subscription = this.substanceFormService.substance.subscribe(substance => {
      this.substance = substance;
    });
    this.subscriptions.push(subscription);

    // Load Substance Name
    if (this.substance.specifiedSubstanceG4m.process[this.processIndex].sites[this.siteIndex].stages[this.stageIndex].startingMaterials[this.startingMaterialIndex].substanceName) {
      let substanceRelated = this.substance.specifiedSubstanceG4m.process[this.processIndex].sites[this.siteIndex].stages[this.stageIndex].startingMaterials[this.startingMaterialIndex].substanceName;
      this.relatedSubstanceUuid = substanceRelated.refuuid;
    }
  }

  ngOnDestroy(): void {
    // this.substanceFormService.unloadSubstance();
    this.subscriptions.forEach(subscription => {
      subscription.unsubscribe();
    });
  }

  updateSubstanceRole(role: string): void {
    this.privateStartingMaterial.substanceRole = role;
  }

  relatedSubstanceUpdated(substance: SubstanceSummary): void {
    if (substance != null) {
      const relatedSubstance: SubstanceRelated = {
        refPname: substance._name,
        name: substance._name,
        refuuid: substance.uuid,
        substanceClass: 'reference',
        approvalID: substance.approvalID
      };

      this.privateStartingMaterial.substanceName = relatedSubstance;
    }
  }

  deleteStartingMaterial(): void {
    this.substance.specifiedSubstanceG4m.process[this.processIndex].sites[this.siteIndex].stages[this.stageIndex].startingMaterials.splice(this.startingMaterialIndex, 1);
  }

  /*
  deleteProductLot(prodComponentIndex: number, prodLotIndex: number) {
    this.productService.deleteProductLot(prodComponentIndex, prodLotIndex);
  }

  deleteProductLot(prodComponentIndex: number, prodLotIndex: number): void {
    this.product.productComponentList[prodComponentIndex].productLotList.splice(prodLotIndex, 1);
  }
  */
}