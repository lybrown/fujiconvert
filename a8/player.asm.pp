    icl 'hardware.asm'

>>> if ($cart) {
    org <<<$cartwindow>>>
cart2ram_start
    and #$1F
    org r:$2000
>>> } else {
    org $2000
>>> }
>>> if ($pcm44) {
lo
    ert <*!=0
    :256 dta $A0|[#&$F]
hi
    ert <*!=0
    :256 dta $10|[#>>4]
>>> } elsif ($pcm4) {
lo
    ert <*!=0
    :256 dta $10|[#&$F]
hi
    ert <*!=0
    :256 dta $10|[#>>4]
>>> }

>>> if ($ram) {
    icl 'ramdetect.asm'
>>> }

    icl 'splash.asm'

main
    jsr splash

    ; disable interrupts, ANTIC, POKEY
    sei
    mva #0 NMIEN
    sta DMACTL
    sta AUDCTL

    ; graphics
    mva #$F COLPM0
    mva #$FF GRAFP0

>>> if ($covox) {
    ; init Covox
>>> } else {
    ; init POKEY
    mva #3 SKCTL
    lda #0
    ldx #7
    sta:rpl AUDF1,x-
>>>   if ($stereo) {
    mva #3 SKCTL+$10
    lda #0
    ldx #7
    sta:rpl AUDF1+$10,x-
>>>   }
>>> }

>>> if ($pcm44) {
    ; 1.79Mhz for channel 1
FAST1 equ 1<<6
    ; 1.79Mhz for channel 3
FAST3 equ 1<<5
    ; HiPass 1+3
HI13 equ 1<<2
    ; 15Khz
KHZ15 equ 1<<0
    mva #[FAST1|FAST3|HI13] AUDCTL
>>>   if ($stereo) {
    mva #[FAST1|FAST3|HI13] AUDCTL+$10
>>>   }
>>> } elsif ($pwm) {
    mva #$AF AUDC1
    mva #$50 AUDCTL
>>>   if ($stereo) {
    mva #$AF AUDC1
    mva #$50 AUDCTL
>>>   }
>>> }

>>> if ($ram) {
extwindow equ $4000
bank equ $80
    ; init bank
    mva #0 bank
>>> } elsif ($cart) {
cartwindow equ <<<$cartwindow>>>
bank equ $80
    ; init bank
    mva #0 bank
>>> }

NOP0 equ 0
NOP equ $FE00
lastkey equ $82
    sta lastkey

>>> if ($pcm44) {
    jsr setpulse
>>> }

play0
    ldy #0 ; 2 cycles
play
    ; pages 0-61
>>> for $page (0 .. 61) {
    ldx extwindow+<<<$page>>>*$100,y ; 4 cycles
    mva hi,x AUDC3 ; 8 cycles
    mva lo,x AUDC1 ; 8 cycles
    ; 20 cycles
    ; Pad to 37 cycles by adding 17 cycles of nop:
    stx HPOSP0 ; 4 cycles
    rol NOP,x ; 7 cycles
    rol NOP ; 6 cycles
>>> }
    ; page 62
    ldx extwindow+62*$100,y ; 4 cycles
    mva hi,x AUDC3 ; 8 cycles
    mva lo,x AUDC1 ; 8 cycles
    ; 20 cycles
    ; Pad to 37 cycles by adding 17 cycles of nop:
    lda SKSTAT ; 4 cycles
    cmp:sta lastkey ; 5 cycles
    bcc keydown ; 2 cycles
    lda NOP,x ; 4 cycles NOP
    nop ; 2 cycles NOP
    ; page 63
donekey
    ldx extwindow+63*$100,y ; 4 cycles
    mva hi,x AUDC3 ; 8 cycles
    mva lo,x AUDC1 ; 8 cycles
    iny ; 2 cycles
branch
    beq next ; 2 cycles +1 if taken same page
    :2 rol NOP0 ; 5+5 cycles
    jmp play ; 3 cycles
next
    ; ert [>next]!=[>branch]
>>> if ($ram) {
    ; Go to next RAM bank
setbank
    lda banks ; 4 cycles
    bne setbank2 ; 3 cycles
    mva #0 setbank+1 ; 6 cycles
    lda banks+0 ; 4 cycles
setbank2
    sta PORTB ; 4 cycles
    inc setbank+1 ; 6 cycles
    jmp play ; 3 cycles
>>> } elsif ($cart) {
jmp_nextbank
    jmp $FFFF ; e.g. nextbank_thecart
>>> } elsif ($emulator) {
    rts
continue
>>> if ($pwm) {
    mva #$AF AUDC1
    mva #$50 AUDCTL
>>>   if ($stereo) {
    mva #$AF AUDC1
    mva #$50 AUDCTL
>>>   }
    jmp play0
>>> }

keydown
    lda KBCODE
>>> if ($pcm44) {
    cmp #63 ; 'A'
    beq toggle
>>> }
>>> if ($ram or $cart) {
    cmp #6 ; '+' Left Arrow
    beq left
    cmp #7 ; '*' Right Arrow
    beq right
    cmp #52 ; 'DEL'
    beq reset
>>> }
    jmp donekey

reset
>>> if ($ram) {
    mva #0 setbank+1
    jmp setbank
>>> } elsif ($cart) {
jmp_initcart
    jsr $FFFF ; e.g. init_thecart
    jmp play
>>> }

left
>>> if ($ram) {
    dec setbank+1
    dec setbank+1
    spl:mva #0 setbank+1
    jmp setbank
>>> } elsif ($cart) {
    dec bank
    dec bank
    jmp jmp_nextbank
>>> }

right
>>> if ($ram) {
    jmp setbank
>>> } elsif ($cart) {
    jmp jmp_nextbank
>>> }

>>> if ($pcm44) {
toggle
    jsr setpulse
    jmp donekey

setpulse
    ; Set up 1/16 dutycycle HiPass on 1+3
    ldx pindex
    mva paudf3,x AUDF3
    mva paudf1,x AUDF1
    sta STIMER
    sta AUDF3
>>> if ($stereo) {
    mva paudf3,x AUDF3+$10
    mva paudf1,x AUDF1+$10
    sta STIMER+$10
    sta AUDF3+$10
>>> }
    lda #1
    eor:sta pindex
    beq altirra
    mva #$0 COLBK
    mva #$F COLPM0
    rts
altirra
    mva #$F COLBK
    mva #$0 COLPM0
    rts
pindex
    dta 0
paudf1
    dta 12,3
paudf3
    dta 13,5
>>> }

>>> if ($ram) {
    run main
>>> }

>>> if ($cart) {
cart2ram_end
cartstart
    ; copy code to ram
    mwa #cart2ram_start $80
    mwa #$2000 $82
    ldx #[[cart2ram_end-cart2ram_start]>>8]+1
    ldy #0
copy
    mva:rne ($80),y ($82),y+
    inc $81
    inc $83
    dex
    bne copy

    jmp main
null
    rts

    ;========================================================
    org $BFFA
    dta a(cartstart) ; start
    dta 0 ; no left cart  XXX should be 1 for 16K carts?
    dta 4 ; no DOS
    dta a(null) ; init
>>> }
