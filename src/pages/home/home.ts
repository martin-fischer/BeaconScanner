import {ChangeDetectorRef, Component} from '@angular/core';
import {Platform} from 'ionic-angular';
import {Subscription} from "rxjs/Subscription";

declare var evothings: any;
declare var cordova: any;

@Component({
  selector: 'page-home',
  templateUrl: 'home.html'
})
export class HomePage {

  beaconData: Map<string, any> = new Map();

  private onResumeSubscription: Subscription;
  private onPauseSubscription: Subscription;

  private isInForeground: boolean = true;


  constructor(private platform: Platform, private changeDetector: ChangeDetectorRef) {
    this.onResumeSubscription = platform.resume.subscribe(() => {
      // do something meaningful when the app is put in the foreground
      this.isInForeground = true;
    });

    this.onPauseSubscription = platform.pause.subscribe(() => {
      // do something meaningful when the app is put in the background
      this.isInForeground = false;
    });
  }


  getBeaconList() {
    let beacons = this.beaconData;

    var beaconList = [];
    for (var key in beacons) {
      beaconList.push(beacons[key]);
    }
    return beaconList;
  }

  startScanningForBeacons() {
    this.platform.ready().then(() => {
      evothings.eddystone.startScan((data) => {

        if (!this.isInForeground) {

          if (this.beaconData[data.address] && !this.beaconData[data.address].notified) {
            data.notified = true;

            cordova.plugins.notification.local.schedule({
              title: 'Beacon found!',
              text: data.address,
              foreground: true
            });
          }
        }


        data.timestamp = Date.now();
        data.distance = evothings.eddystone.calculateAccuracy(data.txPower, data.rssi);
        this.beaconData[data.address] = data;

        this.changeDetector.detectChanges();
      })
    });
  }

  uint8ArrayToString(uint8Array) {
    function format(x) {
      var hex = x.toString(16);
      return hex.length < 2 ? '0' + hex : hex;
    }

    var result = '';
    for (var i = 0; i < uint8Array.length; ++i) {
      result += format(uint8Array[i]) + ' ';
    }
    return result;
  }

  ngOnDestroy() {
    // always unsubscribe your subscriptions to prevent leaks
    this.onResumeSubscription.unsubscribe();
    this.onPauseSubscription.unsubscribe();
  }
}
