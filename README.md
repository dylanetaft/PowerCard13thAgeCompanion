PowerCard13thAgeCompanion
=========================
This project is complementary to HoneyBadger's PowerCard scripts
https://app.roll20.net/forum/post/673780/script-custom-power-cards/#post-762040
Adds some automation capabilities for 13th Age games in Roll20 - mainly power tracking and rally for healing
Use:
Add abilities to a token that tracks a character sheet. Set the abilities to "Show as token action"
Use PowerCard, PowerCards with --usage|daily or --usage|encounter will be tracked and when uses run out, the ability will be automatically
hidden by this script by unsetting "Show as token action"

Character Sheet:
Must contain an "hp" and "recoveries" variable for recover to work

Optional:
Set a character sheet attribute in the following format
pt_uses_Acid Arrow min/max
If a PowerCard is used where --name|Acid Arow, the attribute will decrement by 1 until it is 0, and then will be hidden.


Rechage Commands:
Note, if done when speaking as a GM, will apply to all characters that have an attached token on the current map.

!recharge - recharge daily powers with recharge dies

!recharge all - recover all daily abilities, and recoveries

!recharge encounter - recharge all encounter powers


!recharge overworld - only for those who have overworld advantage - if unspecified recharge die on daily power is 16

!recover x - spend x amount of recoveries
