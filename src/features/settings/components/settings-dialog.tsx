import { AccountTab } from '@/features/settings/components/account-tab';
import Icon3dBoxBottom from '@/components/icons/Icon3dBoxBottom.svg';
import IconDollar from '@/components/icons/IconDollar.svg';
import IconPeople from '@/components/icons/IconPeople.svg';
import IconSettingsGear1 from '@/components/icons/IconSettingsGear1.svg';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { Settings, XIcon } from 'lucide-react';
import { useState } from 'react';
import BillingTab from './billing-tab';

type Tab = 'account' | 'model' | 'billing' | 'advanced';

function SettingsDialog() {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('account');
  const data = {
    nav: [
      { name: 'Account', icon: IconPeople, value: 'account' },
      // { name: 'Model', icon: Icon3dBoxBottom, value: 'model' },
      { name: 'Billing', icon: IconDollar, value: 'billing' },
    ],
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <SidebarMenuItem>
          <SidebarMenuButton tooltip="Settings" className="h-9 cursor-pointer">
            <Settings className="h-4 w-4" />
            <span>Settings</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </DialogTrigger>
      <DialogContent
        showCloseButton={false}
        className="bg-modal overflow-hidden p-0 md:max-h-[500px] md:max-w-[700px] lg:max-w-[800px] h-full max-h-[700px]!"
      >
        <div className="w-full h-full flex">
          <div className="max-w-[240px] w-full h-full bg-background-2 flex flex-col">
            <div className="px-4 py-2">
              <p className="text-lg font-medium text-foreground">Settings</p>
            </div>
            <div className="flex flex-col justify-between h-full">
              <div className="flex flex-col p-2">
                {data.nav.map(nav => {
                  return (
                    <Button
                      onClick={() => setActiveTab(nav.value as Tab)}
                      variant={activeTab === nav.value ? 'secondary' : 'ghost'}
                      className="justify-start"
                    >
                      <nav.icon />
                      <span>{nav.name}</span>
                    </Button>
                  );
                })}
              </div>
              <div className="p-2">
                <Button
                  onClick={() => setActiveTab('advanced')}
                  variant={activeTab == 'advanced' ? 'secondary' : 'ghost'}
                  className="justify-start w-full"
                >
                  <IconSettingsGear1 />
                  <span>Advanced</span>
                </Button>
              </div>
            </div>
          </div>
          <div className="w-full flex flex-col">
            <div className="w-full px-4 py-2 flex gap-2 items-center">
              <p className="capitalize flex-1">{activeTab}</p>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setOpen(false)}
              >
                <XIcon />
              </Button>
            </div>
            {activeTab == 'account' && <AccountTab />}
            {activeTab == 'billing' && <BillingTab />}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default SettingsDialog;
